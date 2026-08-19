import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getTotpStatus} from '@/lib/auth/mfa';
import {getPasskeyStatus} from '@/lib/auth/passkeys';

export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const [totp,passkey]=await Promise.all([getTotpStatus(auth.user.id),getPasskeyStatus(auth.user.id)]);return NextResponse.json({success:true,totp,passkey:{...passkey,available:true},recovery:{available:totp.enabled}});}
