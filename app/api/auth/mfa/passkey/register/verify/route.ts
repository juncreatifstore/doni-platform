import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {verifyAndStoreRegistration} from '@/lib/auth/passkeys';
import {audit} from '@/lib/audit';

export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const b=await req.json();if(!b?.response)return NextResponse.json({success:false,error:'response_required'},{status:400});const credential=await verifyAndStoreRegistration(req,auth.user.id,b.response,b.name);await audit({userId:auth.user.id,action:'AUTH_PASSKEY_ENROLLED',entity:'PortalUser',entityId:auth.user.id,metadata:{credentialId:credential.id}});return NextResponse.json({success:true,credential:{id:credential.id,name:credential.name,createdAt:credential.createdAt}});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'passkey_registration_failed'},{status:400});}}
