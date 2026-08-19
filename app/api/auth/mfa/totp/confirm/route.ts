import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {confirmTotpEnrollment} from '@/lib/auth/mfa';
import {audit} from '@/lib/audit';

export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const body=await req.json();const code=String(body?.code||'');const recoveryCodes=await confirmTotpEnrollment(auth.user.id,code);await audit({userId:auth.user.id,action:'AUTH_MFA_TOTP_ENABLED',entity:'PortalUser',entityId:auth.user.id});return NextResponse.json({success:true,recoveryCodes});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'mfa_confirm_failed'},{status:400});}}
