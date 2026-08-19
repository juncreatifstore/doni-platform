import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {consumeMfaChallenge} from '@/lib/auth/mfa';
import {markCurrentSessionMfaVerified} from '@/lib/auth/session-security';
import {audit} from '@/lib/audit';

export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const b=await req.json();const challenge=String(b?.challenge||''),code=String(b?.code||'');if(!challenge||!code)return NextResponse.json({success:false,error:'mfa_required'},{status:400});const verified=await consumeMfaChallenge(challenge,code);if(verified.userId!==auth.user.id)return NextResponse.json({success:false,error:'forbidden'},{status:403});await markCurrentSessionMfaVerified(verified.method);await audit({userId:auth.user.id,action:'AUTH_STEP_UP',entity:'PortalSession',metadata:{method:verified.method}});return NextResponse.json({success:true,method:verified.method});}catch(e){const error=e instanceof Error?e.message:'step_up_failed';const status=['invalid_mfa_code','invalid_mfa_challenge','mfa_method_not_allowed'].includes(error)?401:error==='mfa_challenge_locked'?429:400;return NextResponse.json({success:false,error},{status});}}
