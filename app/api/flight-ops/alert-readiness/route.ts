import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getAutomaticAlertReadiness} from '@/services/flight-ops/alerts';

export async function GET(){
  const auth=await requireApiUser('SUPER_ADMIN');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  return NextResponse.json({success:true,...await getAutomaticAlertReadiness()});
}
