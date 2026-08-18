'use client';
import { useRouter } from 'next/navigation';
export function LogoutButton(){const router=useRouter();return <button className="btn logoutButton" aria-label="Déconnexion" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh();}}><span className="logoutIcon" aria-hidden>↪</span><span className="logoutLabel">Déconnexion</span></button>}
