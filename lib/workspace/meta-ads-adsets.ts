import {db} from '@/lib/db';

const CATEGORY='Meta Ads Ad Sets';
const PREFIX='meta.ads.adset.';

export type MetaAdsAdSetConfig={
 campaignId:string;
 countries:string[];
 ageMin:number;
 ageMax:number;
 dailyBudget:number;
 remoteAdSetId:string|null;
 remoteStatus:string|null;
 createdAt:string;
 updatedAt:string;
};

function key(id:string){return `${PREFIX}${id}`;}
function countriesOf(input:unknown){const list=Array.isArray(input)?input:String(input||'').split(',');return [...new Set(list.map(x=>String(x).trim().toUpperCase()).filter(x=>/^[A-Z]{2}$/.test(x)))].slice(0,25);}
function age(v:unknown,fallback:number){const n=Math.floor(Number(v));return Number.isFinite(n)?Math.max(18,Math.min(65,n)):fallback;}
function budget(v:unknown){const n=Number(v);return Number.isFinite(n)&&n>0?Math.round(n*100)/100:0;}
function parse(v:unknown):MetaAdsAdSetConfig|null{if(!v||typeof v!=='object')return null;const x=v as any;if(!x.campaignId)return null;return{campaignId:String(x.campaignId),countries:countriesOf(x.countries),ageMin:age(x.ageMin,18),ageMax:age(x.ageMax,65),dailyBudget:budget(x.dailyBudget),remoteAdSetId:x.remoteAdSetId?String(x.remoteAdSetId):null,remoteStatus:x.remoteStatus?String(x.remoteStatus):null,createdAt:String(x.createdAt||new Date(0).toISOString()),updatedAt:String(x.updatedAt||new Date(0).toISOString())};}

export async function getMetaAdsAdSetConfig(campaignId:string){const row=await db.appSetting.findUnique({where:{key:key(campaignId)}});return parse(row?.value);}

export async function listMetaAdsAdSetConfigs(){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{updatedAt:'desc'}});return rows.map(r=>parse(r.value)).filter(Boolean) as MetaAdsAdSetConfig[];}

export async function saveMetaAdsAdSetConfig(campaignId:string,input:{countries:unknown;ageMin:unknown;ageMax:unknown;dailyBudget:unknown},userId:string){const existing=await getMetaAdsAdSetConfig(campaignId);if(existing?.remoteAdSetId)throw new Error('remote_meta_adset_exists_edit_blocked');const countries=countriesOf(input.countries);const ageMin=age(input.ageMin,18),ageMax=age(input.ageMax,65),dailyBudget=budget(input.dailyBudget);if(!countries.length)throw new Error('meta_ads_country_required');if(ageMin>ageMax)throw new Error('meta_ads_age_range_invalid');if(dailyBudget<=0)throw new Error('meta_ads_daily_budget_required');const now=new Date().toISOString();const value:MetaAdsAdSetConfig={campaignId,countries,ageMin,ageMax,dailyBudget,remoteAdSetId:null,remoteStatus:null,createdAt:existing?.createdAt||now,updatedAt:now};await db.appSetting.upsert({where:{key:key(campaignId)},create:{key:key(campaignId),category:CATEGORY,value:value as any,updatedBy:userId},update:{category:CATEGORY,value:value as any,updatedBy:userId}});return value;}

export async function recordPausedMetaAdSet(campaignId:string,remoteAdSetId:string,userId:string){const current=await getMetaAdsAdSetConfig(campaignId);if(!current)throw new Error('meta_ads_adset_config_missing');if(current.remoteAdSetId)return current;const next:MetaAdsAdSetConfig={...current,remoteAdSetId:String(remoteAdSetId),remoteStatus:'PAUSED',updatedAt:new Date().toISOString()};await db.appSetting.update({where:{key:key(campaignId)},data:{value:next as any,updatedBy:userId}});return next;}
