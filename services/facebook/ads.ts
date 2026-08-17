import {db} from '@/lib/db';
import {decryptSecret,encryptSecret} from '@/lib/settings/crypto';
import {getSetting} from '@/lib/settings/service';
import {getMarketingCampaign,recordPausedMetaCampaign} from '@/lib/workspace/marketing-campaigns';

const CATEGORY='Meta Ads';
const KEYS={token:'facebook.ads_access_token',businessId:'facebook.business_id',adAccountId:'facebook.ad_account_id',writeEnabled:'facebook.ads_write_enabled'} as const;

export type MetaAdAccount={id:string;name:string;accountStatus:number|null;currency:string|null;timezoneName:string|null};
export type MetaAdsStatus={connected:boolean;configured:boolean;writeEnabled:boolean;businessId:string|null;adAccountId:string|null;account:MetaAdAccount|null;error:string|null};

function version(v:string|null|undefined){return String(v||'v23.0').replace(/^\/+|\/+$/g,'');}
function normalizeAccountId(v:string|null|undefined){const raw=String(v||'').trim();if(!raw)return null;return raw.startsWith('act_')?raw:`act_${raw.replace(/\D+/g,'')}`;}
async function row(key:string){return db.appSetting.findUnique({where:{key}}).catch(()=>null);}
async function text(key:string){const r:any=await row(key);return r?.value==null?'':String(r.value);}
async function bool(key:string){const r:any=await row(key);return r?.value===true||r?.value==='true'||r?.value===1;}
async function secret(key:string){const r:any=await row(key);return r?.encryptedValue?decryptSecret(String(r.encryptedValue)):'';}
async function graph(path:string,token:string,v:string){const url=new URL(`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`);url.searchParams.set('access_token',token);const res=await fetch(url,{cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}
async function graphPost(path:string,token:string,v:string,params:Record<string,string>){const url=`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`;const body=new URLSearchParams({...params,access_token:token});const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}

export async function saveMetaAdsToken(token:string,userId?:string){if(!token)return;await db.appSetting.upsert({where:{key:KEYS.token},create:{key:KEYS.token,category:CATEGORY,isSecret:true,encryptedValue:encryptSecret(token),updatedBy:userId},update:{category:CATEGORY,isSecret:true,encryptedValue:encryptSecret(token),updatedBy:userId}});}
export async function saveMetaAdsSelection(input:{adAccountId:string;businessId?:string|null},userId?:string){const adAccountId=normalizeAccountId(input.adAccountId);if(!adAccountId)throw new Error('invalid_ad_account');await db.appSetting.upsert({where:{key:KEYS.adAccountId},create:{key:KEYS.adAccountId,category:CATEGORY,isSecret:false,value:adAccountId as any,updatedBy:userId},update:{category:CATEGORY,isSecret:false,value:adAccountId as any,updatedBy:userId}});if(input.businessId!==undefined){await db.appSetting.upsert({where:{key:KEYS.businessId},create:{key:KEYS.businessId,category:CATEGORY,isSecret:false,value:String(input.businessId||'') as any,updatedBy:userId},update:{category:CATEGORY,isSecret:false,value:String(input.businessId||'') as any,updatedBy:userId}});}}
export async function setMetaAdsWriteEnabled(enabled:boolean,userId?:string){await db.appSetting.upsert({where:{key:KEYS.writeEnabled},create:{key:KEYS.writeEnabled,category:CATEGORY,isSecret:false,value:Boolean(enabled) as any,updatedBy:userId},update:{category:CATEGORY,isSecret:false,value:Boolean(enabled) as any,updatedBy:userId}});}

export async function listAccessibleMetaAdAccounts():Promise<MetaAdAccount[]>{
 const [token,v]=await Promise.all([secret(KEYS.token),getSetting<string>('facebook.graph_version')]);
 if(!token)return [];
 const json=await graph('me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100',token,v||'v23.0');
 return (Array.isArray(json?.data)?json.data:[]).map((x:any)=>({id:String(x.id||''),name:String(x.name||x.id||'Compte publicitaire'),accountStatus:Number.isFinite(Number(x.account_status))?Number(x.account_status):null,currency:x.currency?String(x.currency):null,timezoneName:x.timezone_name?String(x.timezone_name):null})).filter((x:MetaAdAccount)=>x.id);
}

export async function getMetaAdsStatus():Promise<MetaAdsStatus>{
 const [token,businessId,rawAccountId,writeEnabled,v]=await Promise.all([secret(KEYS.token),text(KEYS.businessId),text(KEYS.adAccountId),bool(KEYS.writeEnabled),getSetting<string>('facebook.graph_version')]);
 const adAccountId=normalizeAccountId(rawAccountId);
 if(!token)return{connected:false,configured:Boolean(adAccountId),writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:null,error:'meta_ads_oauth_required'};
 if(!adAccountId)return{connected:true,configured:false,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId:null,account:null,error:'ad_account_missing'};
 try{const x=await graph(`${encodeURIComponent(adAccountId)}?fields=id,name,account_status,currency,timezone_name`,token,v||'v23.0');return{connected:true,configured:true,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:{id:String(x.id||adAccountId),name:String(x.name||adAccountId),accountStatus:Number.isFinite(Number(x.account_status))?Number(x.account_status):null,currency:x.currency?String(x.currency):null,timezoneName:x.timezone_name?String(x.timezone_name):null},error:null};}catch(e){return{connected:true,configured:true,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:null,error:e instanceof Error?e.message:'meta_ads_status_failed'};}
}

export async function createPausedMetaCampaign(campaignId:string,userId:string){
 const [campaign,status,token,v]=await Promise.all([getMarketingCampaign(campaignId),getMetaAdsStatus(),secret(KEYS.token),getSetting<string>('facebook.graph_version')]);
 if(!campaign)throw new Error('campaign_not_found');
 if(campaign.channel!=='META_ADS'||!campaign.metaAds)throw new Error('not_meta_ads');
 if(campaign.metaAds.remoteCampaignId)return{ok:true,alreadyCreated:true,campaign};
 if(campaign.metaAds.approvalStatus!=='APPROVED'||!campaign.metaAds.approvedAt||!campaign.metaAds.approvedBy)throw new Error('meta_ads_human_approval_required');
 if(!status.connected||!status.configured||!status.account||!status.adAccountId)throw new Error('meta_ads_account_not_ready');
 if(status.account.accountStatus!==1)throw new Error('meta_ads_account_not_active');
 if(!status.writeEnabled)throw new Error('meta_ads_write_disabled');
 if(!token)throw new Error('meta_ads_token_missing');
 const json=await graphPost(`${encodeURIComponent(status.adAccountId)}/campaigns`,token,v||'v23.0',{
  name:campaign.name,
  objective:'OUTCOME_TRAFFIC',
  status:'PAUSED',
  special_ad_categories:'[]'
 });
 const remoteCampaignId=String(json?.id||'').trim();
 if(!remoteCampaignId)throw new Error('meta_ads_campaign_id_missing');
 const saved=await recordPausedMetaCampaign(campaign.id,remoteCampaignId,userId);
 return{ok:true,alreadyCreated:false,campaign:saved,remoteCampaignId,remoteStatus:'PAUSED' as const};
}
