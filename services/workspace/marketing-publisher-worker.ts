import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import {markAutopilotSent} from '@/lib/workspace/marketing-autopilot';
import {publisherRetryAllowed} from '@/lib/workspace/marketing-publisher-control';

const AUTOPILOT_CATEGORY='DONI Marketing Autopilot';
const AUTOPILOT_PREFIX='marketing.autopilot.';
const EVENT_CATEGORY='DONI Marketing Publisher Events';
const EVENT_PREFIX='marketing.publisher.';

type Item={id:string;status:string;message:string;channelSuggestion:string;conversationId?:string|null;scheduledFor?:string|null;approvedAt?:string|null;approvedBy?:string|null;publicationAllowed?:boolean};
function parse(v:unknown):Item|null{if(!v||typeof v!=='object')return null;const x=v as Item;return x.id&&x.status?x:null;}
async function logEvent(item:Item,status:string,details:Record<string,unknown>={}){const now=new Date().toISOString();await db.appSetting.create({data:{key:`${EVENT_PREFIX}${now}.${randomUUID()}`,category:EVENT_CATEGORY,value:{itemId:item.id,status,channel:item.channelSuggestion,at:now,...details} as any}});}
async function resolveRecipient(item:Item){if(!item.conversationId)return null;const c=await db.doniConversation.findUnique({where:{id:item.conversationId},select:{waId:true}});return c?.waId||null;}

export async function runMarketingPublisherWorker(limit=20){
 const now=Date.now();
 const rows=await db.appSetting.findMany({where:{category:AUTOPILOT_CATEGORY,key:{startsWith:AUTOPILOT_PREFIX}},orderBy:{updatedAt:'asc'},take:200});
 const candidates=rows.map(r=>parse(r.value)).filter((x):x is Item=>Boolean(x&&x.status==='SCHEDULED'&&x.publicationAllowed&&x.approvedAt&&x.approvedBy&&x.scheduledFor&&new Date(x.scheduledFor).getTime()<=now));
 const due:Item[]=[];for(const x of candidates){if(await publisherRetryAllowed(x.id))due.push(x);if(due.length>=Math.max(1,Math.min(limit,50)))break;}
 const stats={due:due.length,sent:0,dryRun:0,blocked:0,failed:0};const results:Array<Record<string,unknown>>=[];
 for(const item of due){try{const channel=String(item.channelSuggestion||'').toLowerCase();if(!channel.includes('whatsapp')){stats.blocked++;await logEvent(item,'BLOCKED',{reason:'channel_not_connected'});results.push({id:item.id,status:'BLOCKED',reason:'channel_not_connected'});continue;}const to=await resolveRecipient(item);if(!to){stats.blocked++;await logEvent(item,'BLOCKED',{reason:'recipient_not_found'});results.push({id:item.id,status:'BLOCKED',reason:'recipient_not_found'});continue;}const delivery=await sendWhatsAppText(to,item.message);if(delivery.dryRun||!delivery.sent){stats.dryRun++;await logEvent(item,'DRY_RUN',{to});results.push({id:item.id,status:'DRY_RUN'});continue;}const marked=await markAutopilotSent(item.id,{id:'publisher-worker',username:'publisher-worker',role:'SYSTEM'});if(!marked.ok){stats.failed++;await logEvent(item,'FAILED',{reason:marked.reason});results.push({id:item.id,status:'FAILED',reason:marked.reason});continue;}stats.sent++;await logEvent(item,'SENT',{to});results.push({id:item.id,status:'SENT'});}catch(error){const reason=error instanceof Error?error.message:'publisher_failed';stats.failed++;await logEvent(item,'FAILED',{reason});results.push({id:item.id,status:'FAILED',reason});}}
 return {...stats,results,ranAt:new Date().toISOString()};
}
