import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getSetting} from '@/lib/settings/service';
import {controlledPollTicket} from '@/services/flight-ops/controlled-poll';
import {audit} from '@/lib/audit';

export async function POST(req:Request){
  const auth=await requireApiUser('SUPER_ADMIN');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  if(!(await getSetting<boolean>('tracking.test_poll_enabled')))return NextResponse.json({success:false,error:'tracking_test_poll_disabled'},{status:403});
  try{
    const body=await req.json();
    const reference=String(body?.reference||'').trim().toUpperCase();
    const result=await controlledPollTicket(reference);
    await audit({userId:auth.user.id,action:'FLIGHT_TRACKING_CONTROLLED_POLL',entity:'Ticket',metadata:{reference,succeeded:result.succeeded,failed:result.failed}});
    return NextResponse.json({success:true,...result});
  }catch(e){
    const msg=e instanceof Error?e.message:'controlled_poll_failed';
    return NextResponse.json({success:false,error:msg},{status:400});
  }
}
