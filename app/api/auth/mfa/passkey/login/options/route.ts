import {NextResponse} from 'next/server';
import {assertMfaMethodAllowed} from '@/lib/auth/mfa';
import {authenticationOptions} from '@/lib/auth/passkeys';

export async function POST(req:Request){try{const b=await req.json();const challenge=String(b?.challenge||'');if(!challenge)return NextResponse.json({success:false,error:'mfa_challenge_required'},{status:400});const current=await assertMfaMethodAllowed(challenge,'PASSKEY');const options=await authenticationOptions(req,challenge,current.userId);return NextResponse.json({success:true,options});}catch(e){const error=e instanceof Error?e.message:'passkey_options_failed';const status=['invalid_mfa_challenge','mfa_method_not_allowed'].includes(error)?401:400;return NextResponse.json({success:false,error},{status});}}
