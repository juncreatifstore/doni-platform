import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {runFlightOps} from '@/services/flight-ops/alerts';
import {audit} from '@/lib/audit';
export async function POST(){const auth=await requireApiUser('SUPER_ADMIN');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const result=await runFlightOps();await audit({userId:auth.user.id,action:'FLIGHT_TRACKING_AUTO_ENGINE_TEST',entity:'FlightTracking',metadata:result});return NextResponse.json({success:true,...result});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'auto_tracking_test_failed'},{status:500});}}
