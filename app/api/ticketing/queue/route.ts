import { NextResponse } from 'next/server';
import { getRecentlyIssued, getTicketQueue } from '@/services/ticketing/service';
import { requireApiUser } from '@/lib/auth/session';
export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{return NextResponse.json({success:true,rows:await getTicketQueue(),issued:await getRecentlyIssued()});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'queue_failed'},{status:500});}}
