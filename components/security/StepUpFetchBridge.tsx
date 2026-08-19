'use client';
import {useEffect} from 'react';
import {performStepUp} from '@/lib/auth/step-up-client';

let stepUpInFlight:Promise<boolean>|null=null;

function methodOf(input:RequestInfo|URL,init?:RequestInit){
 return String(init?.method||(typeof Request!=='undefined'&&input instanceof Request?input.method:'GET')).toUpperCase();
}

function apiUrl(input:RequestInfo|URL){
 try{
  const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
  return new URL(raw,window.location.origin);
 }catch{return null;}
}

function canAutoStepUp(input:RequestInfo|URL,init?:RequestInit){
 const method=methodOf(input,init);
 if(!['POST','PUT','PATCH','DELETE'].includes(method))return false;
 const url=apiUrl(input);
 if(!url||url.origin!==window.location.origin||!url.pathname.startsWith('/api/'))return false;
 if(url.pathname.startsWith('/api/auth/'))return false;
 return true;
}

async function isStepUpRequired(response:Response){
 if(response.status!==428)return false;
 try{const body=await response.clone().json();return body?.error==='step_up_required';}catch{return false;}
}

export function StepUpFetchBridge(){
 useEffect(()=>{
  const original=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input,init)=>{
   if(!canAutoStepUp(input,init))return original(input,init);
   const retryInput=typeof Request!=='undefined'&&input instanceof Request?input.clone():input;
   let response=await original(input,init);
   if(!await isStepUpRequired(response))return response;
   if(!stepUpInFlight)stepUpInFlight=performStepUp().finally(()=>{stepUpInFlight=null});
   await stepUpInFlight;
   response=await original(retryInput,init);
   return response;
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=original;};
 },[]);
 return null;
}
