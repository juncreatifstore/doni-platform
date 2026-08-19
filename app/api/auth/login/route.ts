import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createPortalSession } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { authFingerprint, isLoginBlocked, recordLoginAttempt } from '@/lib/auth/rate-limit';
import {createMfaChallenge,getTotpStatus} from '@/lib/auth/mfa';
import {getPasskeyStatus} from '@/lib/auth/passkeys';

export async function POST(req:Request){
  try{
    const body=await req.json(); const username=String(body?.username||'').trim().toLowerCase(); const password=String(body?.password||'');
    if(!username||!password)return NextResponse.json({success:false,error:'credentials_required'},{status:400});
    const fingerprint=authFingerprint(username,req);
    if(await isLoginBlocked(fingerprint))return NextResponse.json({success:false,error:'too_many_attempts'},{status:429,headers:{'retry-after':'900'}});
    const user=await db.portalUser.findUnique({where:{username}});
    if(!user||!user.active||!verifyPassword(password,user.passwordHash)){
      await recordLoginAttempt(fingerprint,false);
      await audit({action:'AUTH_LOGIN_FAILED',entity:'PortalUser',metadata:{username}});
      return NextResponse.json({success:false,error:'invalid_credentials'},{status:401});
    }
    await db.portalSession.deleteMany({where:{userId:user.id,expiresAt:{lt:new Date()}}});
    const [totp,passkey]=await Promise.all([getTotpStatus(user.id),getPasskeyStatus(user.id)]);
    if(totp.enabled||passkey.enabled){
      const challenge=await createMfaChallenge(user.id);
      const methods:string[]=[];
      if(passkey.enabled)methods.push('PASSKEY');
      if(totp.enabled)methods.push('TOTP','RECOVERY');
      await audit({userId:user.id,action:'AUTH_PASSWORD_VERIFIED_MFA_REQUIRED',entity:'PortalUser',entityId:user.id,metadata:{methods}});
      return NextResponse.json({success:true,mfaRequired:true,challenge,methods});
    }
    await recordLoginAttempt(fingerprint,true);
    await createPortalSession(user.id);
    await db.portalUser.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
    await audit({userId:user.id,action:'AUTH_LOGIN',entity:'PortalUser',entityId:user.id,metadata:{mfa:false}});
    return NextResponse.json({success:true,role:user.role,mfaEnrollmentRecommended:true});
  }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'login_failed'},{status:500});}
}
