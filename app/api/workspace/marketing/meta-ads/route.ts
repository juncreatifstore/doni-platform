import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getMetaAdsStatus,listAccessibleMetaAdAccounts,saveMetaAdsSelection,setMetaAdsWriteEnabled} from '@/services/facebook/ads';

export async function GET(){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:'unauthorized'},{status:401});
 try{const [status,accounts]=await Promise.all([getMetaAdsStatus(),listAccessibleMetaAdAccounts()]);return NextResponse.json({success:true,status,accounts});}
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'meta_ads_diagnostic_failed'},{status:500});}
}

export async function POST(req:Request){
 const auth=await requireApiUser('SUPER_ADMIN');
 if(!auth.ok)return NextResponse.json({success:false,error:'forbidden'},{status:403});
 try{
  const body:any=await req.json().catch(()=>({}));
  if(body.action==='select_account'){
   await saveMetaAdsSelection({adAccountId:String(body.adAccountId||''),businessId:body.businessId==null?undefined:String(body.businessId)},auth.user.id);
   return NextResponse.json({success:true,status:await getMetaAdsStatus()});
  }
  if(body.action==='set_write_enabled'){
   await setMetaAdsWriteEnabled(Boolean(body.enabled),auth.user.id);
   return NextResponse.json({success:true,status:await getMetaAdsStatus()});
  }
  return NextResponse.json({success:false,error:'unsupported_action'},{status:400});
 }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'meta_ads_update_failed'},{status:500});}
}
