import {NextResponse} from 'next/server';
import QRCode from 'qrcode';
import {requireApiUser} from '@/lib/auth/session';
import {beginTotpEnrollment} from '@/lib/auth/mfa';
import {audit} from '@/lib/audit';

export async function POST(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const setup=await beginTotpEnrollment(auth.user);const qrDataUrl=await QRCode.toDataURL(setup.uri,{margin:1,width:280});await audit({userId:auth.user.id,action:'AUTH_MFA_TOTP_SETUP_STARTED',entity:'PortalUser',entityId:auth.user.id});return NextResponse.json({success:true,secret:setup.secret,uri:setup.uri,qrDataUrl});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'mfa_setup_failed'},{status:400});}}
