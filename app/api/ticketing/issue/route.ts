import {getSetting} from '@/lib/settings/service';
import { NextResponse } from 'next/server';
import { issueManual } from '@/services/ticketing/service';
import { requireApiUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});if(!(await getSetting<boolean>('ticketing.write_enabled')))return NextResponse.json({success:false,error:'ticketing_write_disabled'},{status:403});try{const body=await req.json();if(!body?.reference||!body?.pnr)return NextResponse.json({success:false,error:'reference_and_pnr_required'},{status:400});const t=await issueManual({reference:String(body.reference),pnr:String(body.pnr),ticketNumber:body.ticketNumber?String(body.ticketNumber):undefined,agent:auth.user.username});await audit({userId:auth.user.id,action:'TICKET_ISSUE',entity:'Ticket',entityId:t.id,metadata:{reference:t.reference,pnr:t.pnr}});return NextResponse.json({success:true,ticket:t});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'issue_failed'},{status:400});}}
