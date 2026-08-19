import type {OrgRole} from '@/lib/auth/org-roles';

export type MfaEnrollmentState={
 required:boolean;
 compliant:boolean;
 passkeyRequired:boolean;
 acceptedMethods:('PASSKEY'|'TOTP')[];
 reason:string|null;
};

export function mfaEnrollmentState(orgRole:OrgRole,totpEnabled:boolean,passkeyEnabled:boolean):MfaEnrollmentState{
 const privileged=orgRole==='SUPER_ADMIN'||orgRole==='COUNTRY_ADMIN';
 if(privileged){
  return {
   required:true,
   compliant:passkeyEnabled,
   passkeyRequired:true,
   acceptedMethods:['PASSKEY'],
   reason:passkeyEnabled?null:'passkey_required_for_privileged_role'
  };
 }
 const required=['SECTION_MANAGER','AGENT','PARTNER'].includes(orgRole);
 const compliant=!required||passkeyEnabled||totpEnabled;
 return {
  required,
  compliant,
  passkeyRequired:false,
  acceptedMethods:['PASSKEY','TOTP'],
  reason:compliant?null:'mfa_required_for_role'
 };
}
