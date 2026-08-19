'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(){
  const router=useRouter();
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [challenge,setChallenge]=useState('');
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function onSubmit(e:FormEvent){
    e.preventDefault();setError('');setLoading(true);
    try{
      if(challenge){
        const res=await fetch('/api/auth/mfa/challenge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challenge,code})});
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data?.success){const c=String(data?.error||'mfa_failed');setError(c==='invalid_mfa_code'?'Code incorrect. Vérifie Google Authenticator ou utilise un code de récupération.':c==='mfa_challenge_locked'?'Trop de codes incorrects. Recommence la connexion.':'Validation MFA impossible.');if(c==='mfa_challenge_locked'){setChallenge('');setCode('');}return;}
        router.replace('/overview');router.refresh();return;
      }
      const res=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.success){const c=String(data?.error||'login_failed');setError(c==='invalid_credentials'?'Identifiant ou mot de passe incorrect.':c==='too_many_attempts'?'Trop de tentatives. Réessaie dans quelques minutes.':'Connexion impossible.');return;}
      if(data.mfaRequired&&data.challenge){setChallenge(String(data.challenge));setPassword('');return;}
      router.replace('/overview');router.refresh();
    }catch{setError('Connexion impossible.');}finally{setLoading(false);}
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#f6f8fb'}}>
    <section style={{width:'100%',maxWidth:420,background:'#fff',border:'1px solid #e7eaf0',borderRadius:18,padding:32,boxShadow:'0 18px 50px rgba(15,23,42,.08)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:26}}><div style={{width:44,height:44,borderRadius:14,display:'grid',placeItems:'center',background:'#0f172a',color:'#fff',fontWeight:800,fontSize:20}}>D</div><div><div style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>DONI</div><div style={{fontSize:13,color:'#64748b'}}>Travel Operations Portal</div></div></div>
      <h1 style={{fontSize:28,lineHeight:1.1,margin:'0 0 8px',color:'#0f172a'}}>{challenge?'Vérification de sécurité':'Connexion'}</h1>
      <p style={{margin:'0 0 24px',color:'#64748b'}}>{challenge?'Entre le code à 6 chiffres de Google Authenticator. Un code de récupération peut aussi être utilisé.':'Accède au portail sécurisé DONI.'}</p>
      <form onSubmit={onSubmit} style={{display:'grid',gap:16}}>
        {!challenge?<><label style={{display:'grid',gap:7,fontSize:14,fontWeight:600,color:'#334155'}}>Identifiant<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required style={{width:'100%',boxSizing:'border-box',height:46,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 13px',fontSize:16,outline:'none'}} /></label><label style={{display:'grid',gap:7,fontSize:14,fontWeight:600,color:'#334155'}}>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',boxSizing:'border-box',height:46,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 13px',fontSize:16,outline:'none'}} /></label></>:<label style={{display:'grid',gap:7,fontSize:14,fontWeight:600,color:'#334155'}}>Code de sécurité<input inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={e=>setCode(e.target.value)} required placeholder="123456" style={{width:'100%',boxSizing:'border-box',height:52,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 13px',fontSize:22,letterSpacing:4,textAlign:'center',outline:'none'}} /></label>}
        {error?<div role="alert" style={{padding:'11px 12px',borderRadius:10,background:'#fef2f2',color:'#b91c1c',fontSize:14}}>{error}</div>:null}
        <button type="submit" disabled={loading} style={{height:48,border:0,borderRadius:11,background:'#0f172a',color:'#fff',fontSize:16,fontWeight:700,cursor:loading?'wait':'pointer',opacity:loading?.7:1}}>{loading?'Validation…':challenge?'Valider le code':'Se connecter'}</button>
        {challenge?<button type="button" onClick={()=>{setChallenge('');setCode('');setError('')}} style={{height:42,border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',color:'#334155',fontWeight:600}}>Recommencer la connexion</button>:null}
      </form>
    </section>
  </main>
}
