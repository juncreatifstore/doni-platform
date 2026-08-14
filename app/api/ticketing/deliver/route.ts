import {getSetting} from '@/lib/settings/service';
import { NextResponse } from 'next/server';
import { deliverTicket } from '@/services/ticketing/delivery';
import { requireApiUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});if(!(await getSetting<boolean>('ticketing.write_enabled')))return NextResponse.json({success:false,error:'ticketing_write_disabled'},{status:403});try{const body=await req.json();if(!body?.reference)return NextResponse.json({success:false,error:'reference_required'},{status:400});const result=await deliverTicket(String(body.reference));await audit({userId:auth.user.id,action:'TICKET_DELIVER',entity:'Ticket',metadata:{reference:String(body.reference),status:result.status}});return NextResponse.json(result);}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'delivery_failed'},{status:400});}}
