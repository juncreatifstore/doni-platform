import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {assertMfaMethodAllowed} from '@/lib/auth/mfa';
import {authenticationOptions} from '@/lib/auth/passkeys';
import {requireSameOrigin} from '@/lib/auth/origin';

export async function POST(req:Request){const origin=requireSameOrigin(req);if(!origin.ok)return NextResponse.json({success:false,error:origin.error},{status:origin.status});const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const b=await req.json();const challenge=String(b?.challenge||'');if(!challenge)return NextResponse.json({success:false,error:'mfa_challenge_required'},{status:400});const current=await assertMfaMethodAllowed(challenge,'PASSKEY');if(current.userId!==auth.user.id)return NextResponse.json({success:false,error:'forbidden'},{status:403});const options=await authenticationOptions(req,challenge,auth.user.id);return NextResponse.json({success:true,options});}catch(e){const error=e instanceof Error?e.message:'passkey_options_failed';return NextResponse.json({success:false,error},{status:['invalid_mfa_challenge','mfa_method_not_allowed'].includes(error)?401:400});}}
