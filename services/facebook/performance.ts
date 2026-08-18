import {db} from '@/lib/db';
import {decryptSecret} from '@/lib/settings/crypto';
import {getSetting} from '@/lib/settings/service';
import {listMarketingCampaigns} from '@/lib/workspace/marketing-campaigns';
import {listMetaAdsPerformanceGuards} from '@/lib/workspace/meta-ads-performance';

const TOKEN_KEY='facebook.ads_access_token';
function version(v:string|null|undefined){return String(v||'v23.0').replace(/^\/+|\/+$/g,'');}
async function token(){const r:any=await db.appSetting.findUnique({where:{key:TOKEN_KEY}}).catch(()=>null);return r?.encryptedValue?decryptSecret(String(r.encryptedValue)):'';}
async function graph(path:string,accessToken:string,v:string,params:Record<string,string>={}){const url=new URL(`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`);for(const [k,val] of Object.entries(params))url.searchParams.set(k,val);url.searchParams.set('access_token',accessToken);const res=await fetch(url,{cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}
function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:0;}

export type MetaAdsPerformanceRow={campaignId:string;name:string;remoteCampaignId:string;currency:string;status:string|null;effectiveStatus:string|null;spend:number;impressions:number;clicks:number;ctr:number;cpc:number;warningSpend:number;criticalSpend:number;alert:'OK'|'WARNING'|'CRITICAL'|'UNCONFIGURED'|'ERROR';error:string|null};

export async function getMetaAdsPerformance():Promise<MetaAdsPerformanceRow[]>{
 const [campaigns,guards,accessToken,v]=await Promise.all([listMarketingCampaigns(),listMetaAdsPerformanceGuards(),token(),getSetting<string>('facebook.graph_version')]);
 const guardBy=new Map(guards.map(g=>[g.campaignId,g]));
 const items=campaigns.filter(c=>c.channel==='META_ADS'&&c.metaAds?.remoteCampaignId);
 if(!accessToken)return items.map(c=>({campaignId:c.id,name:c.name,remoteCampaignId:String(c.metaAds!.remoteCampaignId),currency:c.currency,status:null,effectiveStatus:null,spend:0,impressions:0,clicks:0,ctr:0,cpc:0,warningSpend:guardBy.get(c.id)?.warningSpend||0,criticalSpend:guardBy.get(c.id)?.criticalSpend||0,alert:'ERROR' as const,error:'meta_ads_token_missing'}));
 return Promise.all(items.map(async c=>{const g=guardBy.get(c.id);try{const remoteId=String(c.metaAds!.remoteCampaignId);const [state,ins]=await Promise.all([graph(encodeURIComponent(remoteId),accessToken,v||'v23.0',{fields:'id,name,status,effective_status'}),graph(`${encodeURIComponent(remoteId)}/insights`,accessToken,v||'v23.0',{fields:'spend,impressions,clicks,ctr,cpc',date_preset:'maximum',limit:'1'})]);const r=Array.isArray(ins?.data)?ins.data[0]||{}:{};const spend=n(r.spend),warningSpend=g?.warningSpend||0,criticalSpend=g?.criticalSpend||0;const alert:MetaAdsPerformanceRow['alert']=criticalSpend<=0?'UNCONFIGURED':spend>=criticalSpend?'CRITICAL':warningSpend>0&&spend>=warningSpend?'WARNING':'OK';return{campaignId:c.id,name:c.name,remoteCampaignId:remoteId,currency:c.currency,status:state?.status?String(state.status):null,effectiveStatus:state?.effective_status?String(state.effective_status):null,spend,impressions:Math.floor(n(r.impressions)),clicks:Math.floor(n(r.clicks)),ctr:n(r.ctr),cpc:n(r.cpc),warningSpend,criticalSpend,alert,error:null};}catch(e){return{campaignId:c.id,name:c.name,remoteCampaignId:String(c.metaAds!.remoteCampaignId),currency:c.currency,status:null,effectiveStatus:null,spend:0,impressions:0,clicks:0,ctr:0,cpc:0,warningSpend:g?.warningSpend||0,criticalSpend:g?.criticalSpend||0,alert:'ERROR' as const,error:e instanceof Error?e.message:'meta_ads_performance_failed'};}}));
}
