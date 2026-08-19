'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';

export function MfaEnrollmentGate(){
 const pathname=usePathname();
 const router=useRouter();
 useEffect(()=>{
  if(!pathname||pathname==='/login'||pathname.startsWith('/security')||pathname.startsWith('/step-up'))return;
  let cancelled=false;
  fetch('/api/auth/mfa/status',{cache:'no-store'}).then(async r=>{
   if(cancelled||r.status===401)return;
   const j=await r.json().catch(()=>({}));
   if(cancelled||!j?.success)return;
   if(j?.enrollment?.required&&!j?.enrollment?.compliant){
    const reason=encodeURIComponent(String(j.enrollment.reason||'mfa_enrollment_required'));
    router.replace(`/security?enrollment_required=1&reason=${reason}`);
   }
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[pathname,router]);
 return null;
}
