import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';

const COPILOT_CATEGORY='DONI Marketing AI Copilot Drafts';
const COPILOT_PREFIX='marketing.ai-copilot.';
const CATEGORY='DONI Marketing Autopilot';
const PREFIX='marketing.autopilot.';

export type AutopilotStatus='DRAFT'|'AI_READY'|'WAITING_APPROVAL'|'APPROVED'|'REJECTED'|'SCHEDULED'|'SENT';
type Actor={id:string;username:string;role:string};
type AutopilotItem={
 id:string;sourceDraftId:string;status:AutopilotStatus;title:string;objective:string;audience:string;message:string;channelSuggestion:string;budgetSuggestion:string;conversationId?:string|null;destination?:string|null;route?:string|null;amount?:number|null;currency?:string|null;source:string;approvalRequired:boolean;publicationAllowed:boolean;createdAt:string;updatedAt:string;submittedAt?:string|null;submittedBy?:string|null;approvedAt?:string|null;approvedBy?:string|null;rejectedAt?:string|null;rejectedBy?:string|null;scheduledAt?:string|null;scheduledFor?:string|null;scheduledBy?:string|null;sentAt?:string|null;sentBy?:string|null;history:Array<{at:string;from:AutopilotStatus|null;to:AutopilotStatus;actor:string;note?:string|null}>;
};

function isAdmin(role:string){return role==='ADMIN'||role==='SUPER_ADMIN';}
function parse(v:unknown):AutopilotItem|null{if(!v||typeof v!=='object')return null;const x=v as AutopilotItem;return x.id&&x.status&&x.sourceDraftId?x:null;}
function key(id:string){return `${PREFIX}${id}`;}

export async function syncCopilotDraftsToAutopilot(){
 const drafts=await db.appSetting.findMany({where:{category:COPILOT_CATEGORY,key:{startsWith:COPILOT_PREFIX}},orderBy:{createdAt:'desc'},take:100});
 const existing=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},select:{value:true}});
 const known=new Set(existing.map(x=>parse(x.value)?.sourceDraftId).filter(Boolean));
 let created=0;
 for(const row of drafts){const d=row.value as any;if(!d?.id||known.has(d.id))continue;const now=new Date().toISOString();const id=randomUUID();const item:AutopilotItem={id,sourceDraftId:d.id,status:'AI_READY',title:String(d.title||'Brouillon DONI'),objective:String(d.objective||''),audience:String(d.audience||''),message:String(d.message||''),channelSuggestion:String(d.channelSuggestion||''),budgetSuggestion:String(d.budgetSuggestion||'Aucune dépense automatique'),conversationId:d.conversationId||null,destination:d.destination||null,route:d.route||null,amount:d.amount??null,currency:d.currency||null,source:String(d.source||'DONI Marketing AI Copilot'),approvalRequired:true,publicationAllowed:false,createdAt:now,updatedAt:now,history:[{at:now,from:null,to:'AI_READY',actor:'DONI',note:'Brouillon importé du Marketing AI Copilot'}]};await db.appSetting.create({data:{key:key(id),category:CATEGORY,value:item as any}});created++;}
 return {created};
}

async function load(id:string){const row=await db.appSetting.findUnique({where:{key:key(id)}});return parse(row?.value);}
async function save(item:AutopilotItem){await db.appSetting.update({where:{key:key(item.id)},data:{value:item as any}});return item;}
function transition(item:AutopilotItem,to:AutopilotStatus,actor:Actor,note?:string|null){const from=item.status;const now=new Date().toISOString();return {...item,status:to,updatedAt:now,history:[...item.history,{at:now,from,to,actor:actor.username,note:note||null}]} as AutopilotItem;}

export async function submitAutopilotForApproval(id:string,actor:Actor){const item=await load(id);if(!item)return {ok:false,reason:'not_found'} as const;if(item.status!=='AI_READY')return {ok:false,reason:`invalid_transition:${item.status}->WAITING_APPROVAL`} as const;let next=transition(item,'WAITING_APPROVAL',actor);next.submittedAt=next.updatedAt;next.submittedBy=actor.username;next.publicationAllowed=false;await save(next);return {ok:true,item:next} as const;}
export async function approveAutopilot(id:string,actor:Actor){if(!isAdmin(actor.role))return {ok:false,reason:'admin_approval_required'} as const;const item=await load(id);if(!item)return {ok:false,reason:'not_found'} as const;if(item.status!=='WAITING_APPROVAL')return {ok:false,reason:`invalid_transition:${item.status}->APPROVED`} as const;let next=transition(item,'APPROVED',actor);next.approvedAt=next.updatedAt;next.approvedBy=actor.username;next.publicationAllowed=false;await save(next);return {ok:true,item:next} as const;}
export async function rejectAutopilot(id:string,actor:Actor,note?:string|null){if(!isAdmin(actor.role))return {ok:false,reason:'admin_approval_required'} as const;const item=await load(id);if(!item)return {ok:false,reason:'not_found'} as const;if(item.status!=='WAITING_APPROVAL')return {ok:false,reason:`invalid_transition:${item.status}->REJECTED`} as const;let next=transition(item,'REJECTED',actor,note);next.rejectedAt=next.updatedAt;next.rejectedBy=actor.username;next.publicationAllowed=false;await save(next);return {ok:true,item:next} as const;}
export async function scheduleAutopilot(id:string,actor:Actor,scheduledFor:string){if(!isAdmin(actor.role))return {ok:false,reason:'admin_schedule_required'} as const;const item=await load(id);if(!item)return {ok:false,reason:'not_found'} as const;if(item.status!=='APPROVED')return {ok:false,reason:`invalid_transition:${item.status}->SCHEDULED`} as const;const when=new Date(scheduledFor);if(!Number.isFinite(when.getTime())||when.getTime()<=Date.now())return {ok:false,reason:'scheduled_time_must_be_future'} as const;let next=transition(item,'SCHEDULED',actor);next.scheduledAt=next.updatedAt;next.scheduledFor=when.toISOString();next.scheduledBy=actor.username;next.publicationAllowed=true;await save(next);return {ok:true,item:next} as const;}

// Reserved for a future publisher worker. There is deliberately no UI action that calls this.
export async function markAutopilotSent(id:string,actor:Actor){const item=await load(id);if(!item)return {ok:false,reason:'not_found'} as const;if(item.status!=='SCHEDULED')return {ok:false,reason:`invalid_transition:${item.status}->SENT`} as const;if(!item.approvedAt||!item.approvedBy)return {ok:false,reason:'human_approval_missing'} as const;if(!item.scheduledFor||new Date(item.scheduledFor).getTime()>Date.now())return {ok:false,reason:'schedule_not_due'} as const;let next=transition(item,'SENT',actor);next.sentAt=next.updatedAt;next.sentBy=actor.username;next.publicationAllowed=false;await save(next);return {ok:true,item:next} as const;}

export async function getMarketingAutopilot(){await syncCopilotDraftsToAutopilot();const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{createdAt:'desc'},take:100});const items=rows.map(x=>parse(x.value)).filter((x):x is AutopilotItem=>Boolean(x));const counts={AI_READY:0,WAITING_APPROVAL:0,APPROVED:0,REJECTED:0,SCHEDULED:0,SENT:0};for(const x of items)if(x.status in counts)(counts as any)[x.status]++;return {items,counts,generatedAt:new Date().toISOString(),safety:{humanApprovalRequired:true,directAiReadyToSentBlocked:true,sendUiEnabled:false}};}
