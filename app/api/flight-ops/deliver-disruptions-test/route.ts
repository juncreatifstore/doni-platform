import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {deliverDisruptionsForTicket} from '@/services/flight-ops/targeted-disruption-delivery';
import {audit} from '@/lib/audit';

export async function POST(req:Request){
  const auth=await requireApiUser('SUPER_ADMIN');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  try{
    const body=await req.json();
    const reference=String(body?.reference||'').trim().toUpperCase();
    const result=await deliverDisruptionsForTicket(reference);
    await audit({userId:auth.user.id,action:'FLIGHT_DISRUPTION_TARGETED_DELIVERY_TEST',entity:'Ticket',metadata:{reference,sent:result.sent,failed:result.failed,eligible:result.eligible}});
    return NextResponse.json({success:true,...result});
  }catch(e){
    const error=e instanceof Error?e.message:'targeted_disruption_delivery_failed';
    const status=error==='tracking_test_delivery_disabled'||error==='automatic_delivery_gates_disabled'||error==='standard_alerts_must_remain_disabled'?403:400;
    return NextResponse.json({success:false,error},{status});
  }
}
