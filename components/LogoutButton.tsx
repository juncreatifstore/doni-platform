'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {notifyAction} from './workspace/ActionFeedback';

export function LogoutButton(){
 const router=useRouter();const[busy,setBusy]=useState(false);
 async function logout(){if(busy)return;setBusy(true);try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok){notifyAction({tone:'error',title:'Déconnexion impossible',message:'La session n’a pas été fermée. Réessaie.'});return}router.replace('/login');router.refresh()}catch{notifyAction({tone:'error',title:'Connexion interrompue',message:'La déconnexion n’a pas été confirmée. Vérifie la connexion puis réessaie.'})}finally{setBusy(false)}}
 return <button className="btn logoutButton" aria-label={busy?'Déconnexion en cours':'Déconnexion'} aria-busy={busy} disabled={busy} onClick={logout}><span className="logoutIcon" aria-hidden>↪</span><span className="logoutLabel">{busy?'Déconnexion…':'Déconnexion'}</span></button>
}
