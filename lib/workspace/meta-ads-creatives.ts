import {db} from '@/lib/db';

const CATEGORY='Meta Ads Creatives';
const PREFIX='meta.ads.creative.';

export type MetaAdsCreativeConfig={campaignId:string;imageUrl:string;headline:string;remoteImageHash:string|null;remoteCreativeId:string|null;remoteAdId:string|null;remoteStatus:string|null;createdAt:string;updatedAt:string};

function key(campaignId:string){return `${PREFIX}${campaignId}`;}
function validHttps(v:string){try{const u=new URL(v);return u.protocol==='https:';}catch{return false;}}
export async function getMetaAdsCreativeConfig(campaignId:string){const row=await db.appSetting.findUnique({where:{key:key(campaignId)}});return row?.value as MetaAdsCreativeConfig|null;}
export async function listMetaAdsCreativeConfigs(){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{updatedAt:'desc'}});return rows.map(r=>r.value as MetaAdsCreativeConfig).filter(x=>x?.campaignId);}
export async function saveMetaAdsCreativeConfig(campaignId:string,input:{imageUrl:string;headline?:string|null},userId:string){const current=await getMetaAdsCreativeConfig(campaignId);if(current?.remoteCreativeId||current?.remoteAdId)throw new Error('meta_ads_remote_creative_exists_edit_blocked');const imageUrl=String(input.imageUrl||'').trim();if(!validHttps(imageUrl))throw new Error('meta_ads_https_image_url_required');const headline=String(input.headline||'').trim().slice(0,120);const now=new Date().toISOString();const value:MetaAdsCreativeConfig={campaignId,imageUrl,headline,remoteImageHash:null,remoteCreativeId:null,remoteAdId:null,remoteStatus:null,createdAt:current?.createdAt||now,updatedAt:now};await db.appSetting.upsert({where:{key:key(campaignId)},create:{key:key(campaignId),category:CATEGORY,value:value as any,updatedBy:userId},update:{category:CATEGORY,value:value as any,updatedBy:userId}});return value;}
export async function recordPausedMetaCreativeAndAd(campaignId:string,input:{remoteImageHash:string;remoteCreativeId:string;remoteAdId:string},userId:string){const current=await getMetaAdsCreativeConfig(campaignId);if(!current)throw new Error('meta_ads_creative_config_missing');if(current.remoteAdId)return current;const next:MetaAdsCreativeConfig={...current,remoteImageHash:String(input.remoteImageHash),remoteCreativeId:String(input.remoteCreativeId),remoteAdId:String(input.remoteAdId),remoteStatus:'PAUSED',updatedAt:new Date().toISOString()};await db.appSetting.update({where:{key:key(campaignId)},data:{value:next as any,updatedBy:userId}});return next;}
