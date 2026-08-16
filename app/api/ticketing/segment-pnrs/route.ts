import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/session';
import { getSetting } from '@/lib/settings/service';
import { setSegmentPnrs } from '@/services/ticketing/service';
import { audit } from '@/lib/audit';

export async function POST(req:Request){
  const auth=await requireApiUser('AGENT');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  if(!(await getSetting<boolean>('ticketing.write_enabled')))return NextResponse.json({success:false,error:'ticketing_write_disabled'},{status:403});
  try{
    const body=await req.json();
    if(!body?.reference||!Array.isArray(body?.pnrs))return NextResponse.json({success:false,error:'reference_and_pnrs_required'},{status:400});
    const t=await setSegmentPnrs({reference:String(body.reference),pnrs:body.pnrs.map(String),agent:auth.user.username});
    await audit({userId:auth.user.id,action:'TICKET_SEGMENT_PNRS_UPDATE',entity:'Ticket',entityId:t.id,metadata:{reference:t.reference,count:body.pnrs.length}});
    return NextResponse.json({success:true,reference:t.reference});
  }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'segment_pnrs_update_failed'},{status:400});}
}
