import {db} from '@/lib/db';
import {decryptSecret} from '@/lib/settings/crypto';
import {getSetting} from '@/lib/settings/service';
import {getMarketingCampaign} from '@/lib/workspace/marketing-campaigns';
import {getMetaAdsAdSetConfig} from '@/lib/workspace/meta-ads-adsets';
import {getMetaAdsCreativeConfig,recordPausedMetaCreativeAndAd} from '@/lib/workspace/meta-ads-creatives';
import {getMetaAdsStatus} from '@/services/facebook/ads';

const TOKEN_KEY='facebook.ads_access_token';
function version(v:string|null|undefined){return String(v||'v23.0').replace(/^\/+|\/+$/g,'');}
async function token(){const r:any=await db.appSetting.findUnique({where:{key:TOKEN_KEY}}).catch(()=>null);return r?.encryptedValue?decryptSecret(String(r.encryptedValue)):'';}
async function graphPost(path:string,accessToken:string,v:string,params:Record<string,string>){const url=`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`;const body=new URLSearchParams({...params,access_token:accessToken});const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}
async function uploadImage(adAccountId:string,imageUrl:string,accessToken:string,v:string){const source=await fetch(imageUrl,{cache:'no-store'});if(!source.ok)throw new Error(`meta_ads_image_fetch_failed:${source.status}`);const type=String(source.headers.get('content-type')||'').toLowerCase();if(!type.startsWith('image/'))throw new Error('meta_ads_image_content_type_invalid');const bytes=await source.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>15*1024*1024)throw new Error('meta_ads_image_size_invalid');const form=new FormData();form.set('access_token',accessToken);form.set('filename',new Blob([bytes],{type}),`doni-ad-${Date.now()}.${type.includes('png')?'png':'jpg'}`);const url=`https://graph.facebook.com/${version(v)}/${encodeURIComponent(adAccountId)}/adimages`;const res=await fetch(url,{method:'POST',body:form,cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta image upload ${res.status}`);const images=json?.images&&typeof json.images==='object'?Object.values(json.images) as any[]:[];const hash=String(images[0]?.hash||'').trim();if(!hash)throw new Error('meta_ads_image_hash_missing');return hash;}
function validHttps(v:string){try{return new URL(v).protocol==='https:';}catch{return false;}}

export async function createPausedMetaCreativeAndAd(campaignId:string,userId:string){
 const [campaign,adSet,creative,status,accessToken,v,pageId]=await Promise.all([getMarketingCampaign(campaignId),getMetaAdsAdSetConfig(campaignId),getMetaAdsCreativeConfig(campaignId),getMetaAdsStatus(),token(),getSetting<string>('facebook.graph_version'),getSetting<string>('facebook.page_id')]);
 if(!campaign||campaign.channel!=='META_ADS'||!campaign.metaAds)throw new Error('not_meta_ads');
 if(campaign.metaAds.approvalStatus!=='APPROVED'||!campaign.metaAds.approvedAt||!campaign.metaAds.approvedBy)throw new Error('meta_ads_human_approval_required');
 if(!campaign.metaAds.remoteCampaignId)throw new Error('meta_ads_remote_campaign_required');
 if(!adSet?.remoteAdSetId)throw new Error('meta_ads_remote_adset_required');
 if(!creative)throw new Error('meta_ads_creative_config_missing');
 if(creative.remoteAdId)return{ok:true,alreadyCreated:true,config:creative};
 if(!creative.imageUrl||!validHttps(creative.imageUrl))throw new Error('meta_ads_https_image_url_required');
 const destinationUrl=String(campaign.metaAds.destinationUrl||'').trim();if(!destinationUrl||!validHttps(destinationUrl))throw new Error('meta_ads_https_destination_url_required');
 if(!campaign.metaAds.creativeText.trim())throw new Error('meta_ads_creative_text_required');
 if(!pageId)throw new Error('facebook_page_id_missing');
 if(!status.connected||!status.configured||!status.account||!status.adAccountId)throw new Error('meta_ads_account_not_ready');
 if(status.account.accountStatus!==1)throw new Error('meta_ads_account_not_active');
 if(!status.writeEnabled)throw new Error('meta_ads_write_disabled');
 if(!accessToken)throw new Error('meta_ads_token_missing');
 const imageHash=await uploadImage(status.adAccountId,creative.imageUrl,accessToken,v||'v23.0');
 const linkData:any={link:destinationUrl,message:campaign.metaAds.creativeText,image_hash:imageHash,call_to_action:{type:campaign.metaAds.callToAction||'LEARN_MORE',value:{link:destinationUrl}}};
 if(creative.headline)linkData.name=creative.headline;
 const creativeJson=await graphPost(`${encodeURIComponent(status.adAccountId)}/adcreatives`,accessToken,v||'v23.0',{
  name:`${campaign.name} · Creative`,
  object_story_spec:JSON.stringify({page_id:String(pageId),link_data:linkData})
 });
 const remoteCreativeId=String(creativeJson?.id||'').trim();if(!remoteCreativeId)throw new Error('meta_ads_creative_id_missing');
 const adJson=await graphPost(`${encodeURIComponent(status.adAccountId)}/ads`,accessToken,v||'v23.0',{
  name:`${campaign.name} · Ad`,
  adset_id:adSet.remoteAdSetId,
  creative:JSON.stringify({creative_id:remoteCreativeId}),
  status:'PAUSED'
 });
 const remoteAdId=String(adJson?.id||'').trim();if(!remoteAdId)throw new Error('meta_ads_ad_id_missing');
 const saved=await recordPausedMetaCreativeAndAd(campaignId,{remoteImageHash:imageHash,remoteCreativeId,remoteAdId},userId);
 return{ok:true,alreadyCreated:false,config:saved,remoteImageHash:imageHash,remoteCreativeId,remoteAdId,remoteStatus:'PAUSED' as const};
}
