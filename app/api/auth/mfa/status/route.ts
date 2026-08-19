import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getTotpStatus} from '@/lib/auth/mfa';

export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const totp=await getTotpStatus(auth.user.id);return NextResponse.json({success:true,totp,passkey:{enabled:false,available:false},recovery:{available:totp.enabled}});}
