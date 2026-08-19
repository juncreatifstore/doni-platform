import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {registrationOptions} from '@/lib/auth/passkeys';
import {audit} from '@/lib/audit';

export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const options=await registrationOptions(req,auth.user);await audit({userId:auth.user.id,action:'AUTH_PASSKEY_ENROLLMENT_STARTED',entity:'PortalUser',entityId:auth.user.id});return NextResponse.json({success:true,options});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'passkey_options_failed'},{status:400});}}
