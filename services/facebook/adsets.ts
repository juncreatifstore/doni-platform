import {db} from '@/lib/db';
import {decryptSecret} from '@/lib/settings/crypto';
import {getSetting} from '@/lib/settings/service';
import {getMarketingCampaign} from '@/lib/workspace/marketing-campaigns';
import {getMetaAdsAdSetConfig,recordPausedMetaAdSet} from '@/lib/workspace/meta-ads-adsets';
import {getMetaAdsStatus} from '@/services/facebook/ads';

const TOKEN_KEY='facebook.ads_access_token';
const ZERO_DECIMAL=new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
function version(v:string|null|undefined){return String(v||'v23.0').replace(/^\/+|\/+$/g,'');}
async function token(){const r:any=await db.appSetting.findUnique({where:{key:TOKEN_KEY}}).catch(()=>null);return r?.encryptedValue?decryptSecret(String(r.encryptedValue)):'';}
function minorUnits(amount:number,currency:string|null|undefined){const n=Number(amount);if(!Number.isFinite(n)||n<=0)throw new Error('meta_ads_daily_budget_required');return String(Math.round(n*(ZERO_DECIMAL.has(String(currency||'').toUpperCase())?1:100)));}
async function graphPost(path:string,accessToken:string,v:string,params:Record<string,string>){const url=`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`;const body=new URLSearchParams({...params,access_token:accessToken});const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}

export async function createPausedMetaAdSet(campaignId:string,userId:string){
 const [campaign,config,status,accessToken,v]=await Promise.all([getMarketingCampaign(campaignId),getMetaAdsAdSetConfig(campaignId),getMetaAdsStatus(),token(),getSetting<string>('facebook.graph_version')]);
 if(!campaign||campaign.channel!=='META_ADS'||!campaign.metaAds)throw new Error('not_meta_ads');
 if(campaign.metaAds.approvalStatus!=='APPROVED'||!campaign.metaAds.approvedAt||!campaign.metaAds.approvedBy)throw new Error('meta_ads_human_approval_required');
 if(!campaign.metaAds.remoteCampaignId)throw new Error('meta_ads_remote_campaign_required');
 if(!config)throw new Error('meta_ads_adset_config_missing');
 if(config.remoteAdSetId)return{ok:true,alreadyCreated:true,config};
 if(!status.connected||!status.configured||!status.account||!status.adAccountId)throw new Error('meta_ads_account_not_ready');
 if(status.account.accountStatus!==1)throw new Error('meta_ads_account_not_active');
 if(!status.writeEnabled)throw new Error('meta_ads_write_disabled');
 if(!accessToken)throw new Error('meta_ads_token_missing');
 const targeting=JSON.stringify({geo_locations:{countries:config.countries},age_min:config.ageMin,age_max:config.ageMax});
 const json=await graphPost(`${encodeURIComponent(status.adAccountId)}/adsets`,accessToken,v||'v23.0',{
  name:`${campaign.name} · Ad Set`,
  campaign_id:campaign.metaAds.remoteCampaignId,
  daily_budget:minorUnits(config.dailyBudget,status.account.currency),
  billing_event:'IMPRESSIONS',
  optimization_goal:'LINK_CLICKS',
  bid_strategy:'LOWEST_COST_WITHOUT_CAP',
  targeting,
  status:'PAUSED'
 });
 const remoteAdSetId=String(json?.id||'').trim();if(!remoteAdSetId)throw new Error('meta_ads_adset_id_missing');
 const saved=await recordPausedMetaAdSet(campaignId,remoteAdSetId,userId);
 return{ok:true,alreadyCreated:false,config:saved,remoteAdSetId,remoteStatus:'PAUSED' as const};
}
