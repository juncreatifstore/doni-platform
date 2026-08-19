import {getTotpStatus} from '@/lib/auth/mfa';
import {getPasskeyStatus} from '@/lib/auth/passkeys';
import {hasRecentPasswordReauth,hasRecentStepUp} from '@/lib/auth/session-security';

export async function requireFactorChangeAuthorization(userId:string){
 const [totp,passkey]=await Promise.all([getTotpStatus(userId),getPasskeyStatus(userId)]);
 const hasExistingFactor=Boolean(totp.enabled||passkey.enabled);
 if(hasExistingFactor){
  if(!(await hasRecentStepUp()))return{ok:false as const,status:428,error:'step_up_required',proof:'MFA' as const};
  return{ok:true as const,proof:'MFA' as const};
 }
 if(!(await hasRecentPasswordReauth()))return{ok:false as const,status:428,error:'password_reauth_required',proof:'PASSWORD' as const};
 return{ok:true as const,proof:'PASSWORD' as const};
}
