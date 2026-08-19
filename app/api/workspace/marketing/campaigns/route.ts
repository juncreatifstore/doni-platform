import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {canAccessDepartments} from '@/lib/auth/data-scope';
import {CAMPAIGN_CHANNELS,CAMPAIGN_STATUSES,createMarketingCampaign,listMarketingCampaignsForUser,marketingCampaignAssigneesForUser} from '@/lib/workspace/marketing-campaigns';

function allowed(user:any){return canAccessDepartments(user,['MARKETING','MANAGEMENT']);}

export async function GET(){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!allowed(auth.user))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const [campaigns,users]=await Promise.all([listMarketingCampaignsForUser(auth.user),marketingCampaignAssigneesForUser(auth.user)]);
 return NextResponse.json({success:true,campaigns,users});
}

export async function POST(req:Request){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!allowed(auth.user))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 try{
  const b=await req.json();
  if(typeof b.name!=='string'||!b.name.trim())return NextResponse.json({success:false,error:'name_required'},{status:400});
  if(!CAMPAIGN_CHANNELS.includes(b.channel))return NextResponse.json({success:false,error:'invalid_channel'},{status:400});
  if(b.status&&!CAMPAIGN_STATUSES.includes(b.status))return NextResponse.json({success:false,error:'invalid_status'},{status:400});
  const country=auth.user.orgRole==='SUPER_ADMIN'?(typeof b.country==='string'?b.country:null):auth.user.country;
  if(auth.user.orgRole!=='SUPER_ADMIN'&&!country)return NextResponse.json({success:false,error:'country_scope_required'},{status:403});
  const campaign=await createMarketingCampaign({...b,country,createdById:auth.user.id});
  return NextResponse.json({success:true,campaign});
 }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'create_failed'},{status:400});}
}
