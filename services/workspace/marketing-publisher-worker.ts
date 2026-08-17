import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import {markAutopilotSent} from '@/lib/workspace/marketing-autopilot';
import {publisherRetryAllowed} from '@/lib/workspace/marketing-publisher-control';
import {evaluatePublisherPolicy,getPublisherPolicy} from '@/lib/workspace/marketing-publisher-policy';
import {evaluateMarketingConsent} from '@/lib/workspace/marketing-consent';

const AUTOPILOT_CATEGORY='DONI Marketing Autopilot';
const AUTOPILOT_PREFIX='marketing.autopilot.';
const EVENT_CATEGORY='DONI Marketing Publisher Events';
const EVENT_PREFIX='marketing.publisher.';
const LOCK_CATEGORY='DONI Marketing Publisher Locks';
const LOCK_PREFIX='marketing.publisher.lock.';
const LOCK_TTL_MS=10*60*1000;

type Item={id:string;status:string;message:string;channelSuggestion:string;conversationId?:string|null;scheduledFor?:string|null;approvedAt?:string|null;approvedBy?:string|null;publicationAllowed?:boolean};
function parse(v:unknown):Item|null{if(!v||typeof v!=='object')return null;const x=v as Item;return x.id&&x.status?x:null;}
async function logEvent(item:Item,status:string,details:Record<string,unknown>={}){const now=new Date().toISOString();await db.appSetting.create({data:{key:`${EVENT_PREFIX}${now}.${randomUUID()}`,category:EVENT_CATEGORY,value:{itemId:item.id,status,channel:item.channelSuggestion,at:now,...details} as any}});}
async function heartbeat(details:Record<string,unknown>={}){const now=new Date().toISOString();await db.appSetting.create({data:{key:`${EVENT_PREFIX}${now}.${randomUUID()}`,category:EVENT_CATEGORY,value:{itemId:'__worker__',status:'RUN',channel:'SYSTEM',at:now,...details} as any}});}
async function resolveRecipient(item:Item){if(!item.conversationId)return null;const c=await db.doniConversation.findUnique({where:{id:item.conversationId},select:{waId:true}});return c?.waId||null;}
async function alreadySent(itemId:string){const rows=await db.appSetting.findMany({where:{category:EVENT_CATEGORY,key:{startsWith:EVENT_PREFIX}},orderBy:{createdAt:'desc'},take:500});return rows.some(r=>{const v=r.value as any;return v?.itemId===itemId&&v?.status==='SENT';});}
async function acquireLock(itemId:string){const key=`${LOCK_PREFIX}${itemId}`;const old=await db.appSetting.findUnique({where:{key}});if(old){const v=old.value as any;const acquired=new Date(v?.acquiredAt||0).getTime();if(Number.isFinite(acquired)&&Date.now()-acquired>LOCK_TTL_MS)await db.appSetting.delete({where:{key}}).catch(()=>{});else return false;}try{await db.appSetting.create({data:{key,category:LOCK_CATEGORY,value:{itemId,acquiredAt:new Date().toISOString(),owner:'publisher-worker'} as any}});return true;}catch{return false;}}
async function releaseLock(itemId:string){await db.appSetting.delete({where:{key:`${LOCK_PREFIX}${itemId}`}}).catch(()=>{});}

export async function runMarketingPublisherWorker(limit=20){
 const now=Date.now();const policy=await getPublisherPolicy();const effectiveLimit=Math.max(1,Math.min(limit,policy.maxPerRun,50));
 if(policy.globalPause){await heartbeat({due:0,paused:true,reason:'global_pause'});return{due:0,sent:0,dryRun:0,blocked:0,failed:0,skipped:0,deferred:0,paused:true,results:[],ranAt:new Date().toISOString()};}
 const rows=await db.appSetting.findMany({where:{category:AUTOPILOT_CATEGORY,key:{startsWith:AUTOPILOT_PREFIX}},orderBy:{updatedAt:'asc'},take:200});
 const candidates=rows.map(r=>parse(r.value)).filter((x):x is Item=>Boolean(x&&x.status==='SCHEDULED'&&x.publicationAllowed&&x.approvedAt&&x.approvedBy&&x.scheduledFor&&new Date(x.scheduledFor).getTime()<=now));
 const due:Item[]=[];for(const x of candidates){if(await publisherRetryAllowed(x.id))due.push(x);if(due.length>=effectiveLimit)break;}
 const stats={due:due.length,sent:0,dryRun:0,blocked:0,failed:0,skipped:0,deferred:0};const results:Array<Record<string,unknown>>=[];await heartbeat({due:due.length,maxPerRun:policy.maxPerRun,maxPerHour:policy.maxPerHour,maxPerRecipient24h:policy.maxPerRecipient24h});
 for(const item of due){if(await alreadySent(item.id)){stats.skipped++;results.push({id:item.id,status:'SKIPPED',reason:'idempotent_already_sent'});continue;}if(!(await acquireLock(item.id))){stats.skipped++;results.push({id:item.id,status:'SKIPPED',reason:'locked'});continue;}try{const channel=String(item.channelSuggestion||'').toLowerCase();if(!channel.includes('whatsapp')){stats.blocked++;await logEvent(item,'BLOCKED',{reason:'channel_not_connected'});results.push({id:item.id,status:'BLOCKED',reason:'channel_not_connected'});continue;}const to=await resolveRecipient(item);if(!to){stats.blocked++;await logEvent(item,'BLOCKED',{reason:'recipient_not_found'});results.push({id:item.id,status:'BLOCKED',reason:'recipient_not_found'});continue;}const consentGate=await evaluateMarketingConsent(to);if(!consentGate.allowed){stats.blocked++;await logEvent(item,'BLOCKED',{reason:consentGate.reason,to,consentStatus:consentGate.consent.status,consentSource:consentGate.consent.source});results.push({id:item.id,status:'BLOCKED',reason:consentGate.reason});continue;}const gate=await evaluatePublisherPolicy(to);if(!gate.allowed){stats.deferred++;await logEvent(item,'DEFERRED',{reason:gate.reason,retryAfter:gate.retryAfter||null,to});results.push({id:item.id,status:'DEFERRED',reason:gate.reason,retryAfter:gate.retryAfter||null});continue;}const delivery=await sendWhatsAppText(to,item.message);if(delivery.dryRun||!delivery.sent){stats.dryRun++;await logEvent(item,'DRY_RUN',{to});results.push({id:item.id,status:'DRY_RUN'});continue;}const marked=await markAutopilotSent(item.id,{id:'publisher-worker',username:'publisher-worker',role:'SYSTEM'});if(!marked.ok){stats.failed++;await logEvent(item,'FAILED',{reason:marked.reason});results.push({id:item.id,status:'FAILED',reason:marked.reason});continue;}stats.sent++;await logEvent(item,'SENT',{to,idempotencyKey:`publisher:${item.id}`,consentStatus:consentGate.consent.status});results.push({id:item.id,status:'SENT'});}catch(error){const reason=error instanceof Error?error.message:'publisher_failed';stats.failed++;await logEvent(item,'FAILED',{reason});results.push({id:item.id,status:'FAILED',reason});}finally{await releaseLock(item.id);}}
 return {...stats,results,ranAt:new Date().toISOString()};
}
