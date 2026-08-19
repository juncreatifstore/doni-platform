'use client';
import {useEffect} from 'react';
import {performStepUp} from '@/lib/auth/step-up-client';

let stepUpInFlight:Promise<boolean>|null=null;
let passwordReauthInFlight:Promise<boolean>|null=null;

function methodOf(input:RequestInfo|URL,init?:RequestInit){
 return String(init?.method||(typeof Request!=='undefined'&&input instanceof Request?input.method:'GET')).toUpperCase();
}

function apiUrl(input:RequestInfo|URL){
 try{
  const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
  return new URL(raw,window.location.origin);
 }catch{return null;}
}

function isFactorEnrollmentPath(pathname:string){
 return pathname.startsWith('/api/auth/mfa/passkey/register/')||pathname.startsWith('/api/auth/mfa/totp/');
}

function canAutoStepUp(input:RequestInfo|URL,init?:RequestInit){
 const method=methodOf(input,init);
 if(!['POST','PUT','PATCH','DELETE'].includes(method))return false;
 const url=apiUrl(input);
 if(!url||url.origin!==window.location.origin||!url.pathname.startsWith('/api/'))return false;
 if(url.pathname.startsWith('/api/auth/')&&!isFactorEnrollmentPath(url.pathname))return false;
 return true;
}

async function securityRequirement(response:Response){
 if(response.status!==428)return null;
 try{const body=await response.clone().json();return body?.error==='step_up_required'?'MFA':body?.error==='password_reauth_required'?'PASSWORD':null;}catch{return null;}
}

async function passwordReauth(original:typeof window.fetch){
 const password=window.prompt('Confirme ton mot de passe DONI pour sécuriser l’activation de ton premier facteur.');
 if(!password)throw new Error('password_reauth_cancelled');
 const r=await original('/api/auth/reauth/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j?.success)throw new Error(j?.error||'password_reauth_failed');
 return true;
}

export function StepUpFetchBridge(){
 useEffect(()=>{
  const original=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input,init)=>{
   if(!canAutoStepUp(input,init))return original(input,init);
   const retryInput=typeof Request!=='undefined'&&input instanceof Request?input.clone():input;
   let response=await original(input,init);
   const requirement=await securityRequirement(response);
   if(!requirement)return response;
   if(requirement==='MFA'){
    if(!stepUpInFlight)stepUpInFlight=performStepUp().finally(()=>{stepUpInFlight=null});
    await stepUpInFlight;
   }else{
    if(!passwordReauthInFlight)passwordReauthInFlight=passwordReauth(original).finally(()=>{passwordReauthInFlight=null});
    await passwordReauthInFlight;
   }
   response=await original(retryInput,init);
   return response;
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=original;};
 },[]);
 return null;
}
