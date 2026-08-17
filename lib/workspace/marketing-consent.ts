import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';

const CATEGORY='DONI Marketing Consent';
const PREFIX='marketing.consent.';
const EVENT_CATEGORY='DONI Marketing Consent Events';
const EVENT_PREFIX='marketing.consent.event.';
const POLICY_KEY='marketing.consent.policy';

export type MarketingConsentStatus='UNKNOWN'|'OPTED_IN'|'OPTED_OUT';
export type MarketingConsentRecord={recipient:string;status:MarketingConsentStatus;source:string;updatedAt:string;updatedBy?:string|null;reason?:string|null};

function normalizeRecipient(value:string){return String(value||'').replace(/[^0-9]/g,'');}
function recordKey(recipient:string){return `${PREFIX}${normalizeRecipient(recipient)}`;}
function asRecord(value:unknown):MarketingConsentRecord|null{if(!value||typeof value!=='object')return null;const v=value as MarketingConsentRecord;return v.recipient&&v.status?v:null;}
async function logConsentEvent(record:MarketingConsentRecord,previous:MarketingConsentStatus){const now=new Date().toISOString();await db.appSetting.create({data:{key:`${EVENT_PREFIX}${now}.${randomUUID()}`,category:EVENT_CATEGORY,value:{recipient:record.recipient,previous,status:record.status,source:record.source,updatedBy:record.updatedBy||null,reason:record.reason||null,at:now} as any}});}

export async function getMarketingConsent(recipient:string){const normalized=normalizeRecipient(recipient);if(!normalized)return{recipient:normalized,status:'UNKNOWN' as const,source:'none',updatedAt:null};const row=await db.appSetting.findUnique({where:{key:recordKey(normalized)}});const parsed=asRecord(row?.value);return parsed||{recipient:normalized,status:'UNKNOWN' as const,source:'none',updatedAt:null};}

export async function setMarketingConsent(recipient:string,status:MarketingConsentStatus,options:{source:string;updatedBy?:string|null;reason?:string|null}){const normalized=normalizeRecipient(recipient);if(!normalized)return{ok:false,reason:'invalid_recipient'} as const;const before=await getMarketingConsent(normalized);const now=new Date().toISOString();const record:MarketingConsentRecord={recipient:normalized,status,source:options.source,updatedAt:now,updatedBy:options.updatedBy||null,reason:options.reason||null};await db.appSetting.upsert({where:{key:recordKey(normalized)},create:{key:recordKey(normalized),category:CATEGORY,value:record as any},update:{category:CATEGORY,value:record as any}});await logConsentEvent(record,before.status);return{ok:true,record} as const;}

export async function getMarketingConsentPolicy(){const row=await db.appSetting.findUnique({where:{key:POLICY_KEY}});const value=(row?.value||{}) as any;return{requireExplicitConsent:value.requireExplicitConsent===true};}
export async function setMarketingConsentPolicy(requireExplicitConsent:boolean,updatedBy:string){await db.appSetting.upsert({where:{key:POLICY_KEY},create:{key:POLICY_KEY,category:CATEGORY,value:{requireExplicitConsent,updatedBy,updatedAt:new Date().toISOString()} as any},update:{category:CATEGORY,value:{requireExplicitConsent,updatedBy,updatedAt:new Date().toISOString()} as any}});return{ok:true} as const;}

export async function evaluateMarketingConsent(recipient:string){const [consent,policy]=await Promise.all([getMarketingConsent(recipient),getMarketingConsentPolicy()]);if(consent.status==='OPTED_OUT')return{allowed:false,reason:'marketing_opted_out',consent,policy} as const;if(policy.requireExplicitConsent&&consent.status!=='OPTED_IN')return{allowed:false,reason:'explicit_marketing_consent_required',consent,policy} as const;return{allowed:true,reason:'allowed',consent,policy} as const;}

const OPT_OUT=new Set(['stop','arret','arrêt','desabonner','désabonner','unsubscribe','baja','parar','detener','sispann','pa voye mesaj','pa voye m mesaj']);
const OPT_IN=new Set(['start','reprendre','subscribe','alta','continuar','kontinye','rekòmanse','rekomanse']);
function normalizeCommand(text:string){return String(text||'').trim().toLocaleLowerCase().replace(/[.!?;,]+$/g,'').replace(/\s+/g,' ');}
export async function handleMarketingPreferenceCommand(recipient:string,text:string){const command=normalizeCommand(text);if(OPT_OUT.has(command)){const result=await setMarketingConsent(recipient,'OPTED_OUT',{source:'WHATSAPP_COMMAND',reason:`command:${command}`});return{handled:true,status:'OPTED_OUT' as const,reply:'✅ Vous ne recevrez plus de messages marketing de DONI. Vous pouvez écrire START à tout moment pour les réactiver.',result};}if(OPT_IN.has(command)){const result=await setMarketingConsent(recipient,'OPTED_IN',{source:'WHATSAPP_COMMAND',reason:`command:${command}`});return{handled:true,status:'OPTED_IN' as const,reply:'✅ Vos messages marketing DONI sont réactivés. Vous pouvez écrire STOP à tout moment pour vous désinscrire.',result};}return{handled:false} as const;}

export async function getMarketingConsentDashboard(){const [records,events,policy]=await Promise.all([db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{updatedAt:'desc'},take:300}),db.appSetting.findMany({where:{category:EVENT_CATEGORY,key:{startsWith:EVENT_PREFIX}},orderBy:{createdAt:'desc'},take:200}),getMarketingConsentPolicy()]);const parsed=records.map(r=>asRecord(r.value)).filter((x):x is MarketingConsentRecord=>Boolean(x));const counts={OPTED_IN:0,OPTED_OUT:0,UNKNOWN:0};for(const x of parsed)counts[x.status]++;return{policy,counts,records:parsed,events:events.map(e=>e.value as any).filter(Boolean),generatedAt:new Date().toISOString()};}
