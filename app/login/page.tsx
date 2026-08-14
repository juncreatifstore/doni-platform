'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(){
  const router=useRouter();
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function onSubmit(e:FormEvent){
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const res=await fetch('/api/auth/login',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({username,password})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.success){
        const code=String(data?.error||'login_failed');
        setError(code==='invalid_credentials'?'Identifiant ou mot de passe incorrect.':code==='too_many_attempts'?'Trop de tentatives. Réessaie dans quelques minutes.':'Connexion impossible.');
        return;
      }
      router.replace('/overview');
      router.refresh();
    }catch{
      setError('Connexion impossible.');
    }finally{
      setLoading(false);
    }
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#f6f8fb'}}>
    <section style={{width:'100%',maxWidth:420,background:'#fff',border:'1px solid #e7eaf0',borderRadius:18,padding:32,boxShadow:'0 18px 50px rgba(15,23,42,.08)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:26}}>
        <div style={{width:44,height:44,borderRadius:14,display:'grid',placeItems:'center',background:'#0f172a',color:'#fff',fontWeight:800,fontSize:20}}>D</div>
        <div><div style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>DONI</div><div style={{fontSize:13,color:'#64748b'}}>Travel Operations Portal</div></div>
      </div>
      <h1 style={{fontSize:28,lineHeight:1.1,margin:'0 0 8px',color:'#0f172a'}}>Connexion</h1>
      <p style={{margin:'0 0 24px',color:'#64748b'}}>Accède au portail d’administration DONI.</p>
      <form onSubmit={onSubmit} style={{display:'grid',gap:16}}>
        <label style={{display:'grid',gap:7,fontSize:14,fontWeight:600,color:'#334155'}}>Identifiant
          <input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required style={{width:'100%',boxSizing:'border-box',height:46,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 13px',fontSize:16,outline:'none'}} />
        </label>
        <label style={{display:'grid',gap:7,fontSize:14,fontWeight:600,color:'#334155'}}>Mot de passe
          <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',boxSizing:'border-box',height:46,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 13px',fontSize:16,outline:'none'}} />
        </label>
        {error?<div role="alert" style={{padding:'11px 12px',borderRadius:10,background:'#fef2f2',color:'#b91c1c',fontSize:14}}>{error}</div>:null}
        <button type="submit" disabled={loading} style={{height:48,border:0,borderRadius:11,background:'#0f172a',color:'#fff',fontSize:16,fontWeight:700,cursor:loading?'wait':'pointer',opacity:loading?.7:1}}>{loading?'Connexion…':'Se connecter'}</button>
      </form>
    </section>
  </main>
}
