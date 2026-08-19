'use client';
import {useEffect,useState} from 'react';
import {performStepUp} from '@/lib/auth/step-up-client';

export function StepUpGate({returnTo}:{returnTo:string}){
 const[status,setStatus]=useState('Validation de sécurité requise…');
 const[busy,setBusy]=useState(false);
 async function verify(){if(busy)return;setBusy(true);setStatus('Valide ton identité avec Passkey ou Google Authenticator.');try{await performStepUp();setStatus('Identité confirmée. Reprise de l’opération…');window.location.replace(returnTo);}catch(e){setStatus(e instanceof Error?`Validation impossible : ${e.message}`:'Validation impossible.');setBusy(false)}}
 useEffect(()=>{verify()},[]);// eslint-disable-line react-hooks/exhaustive-deps
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f6f8fb'}}><section style={{width:'100%',maxWidth:460,background:'#fff',border:'1px solid #e7eaf0',borderRadius:18,padding:32,boxShadow:'0 18px 50px rgba(15,23,42,.08)'}}><div style={{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:8}}>DONI — Vérification renforcée</div><p style={{color:'#64748b',lineHeight:1.5}}>{status}</p><button type="button" onClick={verify} disabled={busy} style={{width:'100%',height:48,border:0,borderRadius:10,background:'#0f172a',color:'#fff',fontWeight:700,fontSize:15}}>{busy?'Validation…':'Revalider mon identité'}</button></section></main>;
}
