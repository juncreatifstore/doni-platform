import {NextRequest,NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getReservationOverview} from '@/services/post-booking/reservations';

export async function GET(req:NextRequest){
  const auth=await requireApiUser('AGENT');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  try{
    const reference=req.nextUrl.searchParams.get('reference')||undefined;
    return NextResponse.json({success:true,rows:await getReservationOverview(reference)});
  }catch(e){
    return NextResponse.json({success:false,error:e instanceof Error?e.message:'reservations_failed'},{status:500});
  }
}
