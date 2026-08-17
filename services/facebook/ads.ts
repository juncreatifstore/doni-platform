import {getSetting} from '@/lib/settings/service';

export type MetaAdAccount={id:string;name:string;accountStatus:number|null;currency:string|null;timezoneName:string|null};
export type MetaAdsStatus={connected:boolean;configured:boolean;writeEnabled:boolean;businessId:string|null;adAccountId:string|null;account:MetaAdAccount|null;error:string|null};

function version(v:string|null|undefined){return String(v||'v23.0').replace(/^\/+|\/+$/g,'');}
function normalizeAccountId(v:string|null|undefined){const raw=String(v||'').trim();if(!raw)return null;return raw.startsWith('act_')?raw:`act_${raw.replace(/\D+/g,'')}`;}
async function graph(path:string,token:string,v:string){const url=new URL(`https://graph.facebook.com/${version(v)}/${path.replace(/^\//,'')}`);url.searchParams.set('access_token',token);const res=await fetch(url,{cache:'no-store'});const json:any=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json?.error?.message||`Meta Graph ${res.status}`);return json;}

export async function listAccessibleMetaAdAccounts():Promise<MetaAdAccount[]>{
 const [token,v]=await Promise.all([getSetting<string>('facebook.ads_access_token'),getSetting<string>('facebook.graph_version')]);
 if(!token)return [];
 const json=await graph('me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100',token,v||'v23.0');
 return (Array.isArray(json?.data)?json.data:[]).map((x:any)=>({id:String(x.id||''),name:String(x.name||x.id||'Compte publicitaire'),accountStatus:Number.isFinite(Number(x.account_status))?Number(x.account_status):null,currency:x.currency?String(x.currency):null,timezoneName:x.timezone_name?String(x.timezone_name):null})).filter((x:MetaAdAccount)=>x.id);
}

export async function getMetaAdsStatus():Promise<MetaAdsStatus>{
 const [token,businessId,rawAccountId,writeEnabled,v]=await Promise.all([
  getSetting<string>('facebook.ads_access_token'),getSetting<string>('facebook.business_id'),getSetting<string>('facebook.ad_account_id'),getSetting<boolean>('facebook.ads_write_enabled'),getSetting<string>('facebook.graph_version')
 ]);
 const adAccountId=normalizeAccountId(rawAccountId);
 if(!token)return{connected:false,configured:Boolean(adAccountId),writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:null,error:'meta_ads_oauth_required'};
 if(!adAccountId)return{connected:true,configured:false,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId:null,account:null,error:'ad_account_missing'};
 try{
  const x=await graph(`${encodeURIComponent(adAccountId)}?fields=id,name,account_status,currency,timezone_name`,token,v||'v23.0');
  return{connected:true,configured:true,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:{id:String(x.id||adAccountId),name:String(x.name||adAccountId),accountStatus:Number.isFinite(Number(x.account_status))?Number(x.account_status):null,currency:x.currency?String(x.currency):null,timezoneName:x.timezone_name?String(x.timezone_name):null},error:null};
 }catch(e){return{connected:true,configured:true,writeEnabled:Boolean(writeEnabled),businessId:businessId||null,adAccountId,account:null,error:e instanceof Error?e.message:'meta_ads_status_failed'};}
}
