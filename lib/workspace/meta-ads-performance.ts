import {db} from '@/lib/db';

const CATEGORY='Meta Ads Performance Guards';
const PREFIX='meta.ads.performance.';

export type MetaAdsPerformanceGuard={campaignId:string;warningSpend:number;criticalSpend:number;createdAt:string;updatedAt:string};
function key(id:string){return `${PREFIX}${id}`;}
function amount(v:unknown){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0;}
function parse(v:unknown):MetaAdsPerformanceGuard|null{if(!v||typeof v!=='object')return null;const x=v as any;if(!x.campaignId)return null;return{campaignId:String(x.campaignId),warningSpend:amount(x.warningSpend),criticalSpend:amount(x.criticalSpend),createdAt:String(x.createdAt||new Date(0).toISOString()),updatedAt:String(x.updatedAt||new Date(0).toISOString())};}

export async function getMetaAdsPerformanceGuard(campaignId:string){const row=await db.appSetting.findUnique({where:{key:key(campaignId)}});return parse(row?.value);}
export async function listMetaAdsPerformanceGuards(){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{updatedAt:'desc'}});return rows.map(r=>parse(r.value)).filter(Boolean) as MetaAdsPerformanceGuard[];}
export async function saveMetaAdsPerformanceGuard(campaignId:string,input:{warningSpend:unknown;criticalSpend:unknown},userId:string){const warningSpend=amount(input.warningSpend),criticalSpend=amount(input.criticalSpend);if(criticalSpend<=0)throw new Error('meta_ads_critical_spend_required');if(warningSpend<0||warningSpend>=criticalSpend)throw new Error('meta_ads_spend_thresholds_invalid');const current=await getMetaAdsPerformanceGuard(campaignId);const now=new Date().toISOString();const value:MetaAdsPerformanceGuard={campaignId,warningSpend,criticalSpend,createdAt:current?.createdAt||now,updatedAt:now};await db.appSetting.upsert({where:{key:key(campaignId)},create:{key:key(campaignId),category:CATEGORY,value:value as any,updatedBy:userId},update:{category:CATEGORY,value:value as any,updatedBy:userId}});return value;}
