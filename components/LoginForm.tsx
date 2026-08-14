'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
export function LoginForm(){
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const fd=new FormData(e.currentTarget);const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:fd.get('username'),password:fd.get('password')})});const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(j.error==='invalid_credentials'?'Identifiants incorrects.':'Connexion impossible.');return;}router.replace('/overview');router.refresh();}
 return <form className="loginCard" onSubmit={submit}><div className="loginLogo">✈️</div><h1>DONI Portal</h1><p>Créatif Travel — accès équipe</p><label>Utilisateur<input name="username" autoComplete="username" required/></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<div className="loginError">{error}</div>}<button className="btn primary loginBtn" disabled={busy}>{busy?'Connexion…':'Se connecter'}</button></form>
}
