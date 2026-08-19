import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {createMfaChallenge,getTotpStatus,type MfaMethod} from '@/lib/auth/mfa';
import {getPasskeyStatus} from '@/lib/auth/passkeys';

export async function POST(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const[totp,passkey]=await Promise.all([getTotpStatus(auth.user.id),getPasskeyStatus(auth.user.id)]);const privileged=auth.user.orgRole==='SUPER_ADMIN'||auth.user.orgRole==='COUNTRY_ADMIN';const methods:MfaMethod[]=[];if(privileged&&passkey.enabled){methods.push('PASSKEY');if(totp.enabled)methods.push('RECOVERY')}else{if(passkey.enabled)methods.push('PASSKEY');if(totp.enabled)methods.push('TOTP','RECOVERY')}if(!methods.length)return NextResponse.json({success:false,error:'mfa_not_configured'},{status:409});const challenge=await createMfaChallenge(auth.user.id,methods);return NextResponse.json({success:true,challenge,methods});}
