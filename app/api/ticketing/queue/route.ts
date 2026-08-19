import { NextResponse } from 'next/server';
import { getRecentlyIssued, getTicketQueue } from '@/services/ticketing/service';
import { requireApiUser } from '@/lib/auth/session';
import {dataScopeForUser,canAccessDepartments} from '@/lib/auth/data-scope';
export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});if(!canAccessDepartments(auth.user,['TICKETING','OPERATIONS','MANAGEMENT']))return NextResponse.json({success:false,error:'forbidden_department'},{status:403});try{const scope=dataScopeForUser(auth.user);return NextResponse.json({success:true,rows:await getTicketQueue(scope),issued:await getRecentlyIssued(scope)});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'queue_failed'},{status:500});}}
