import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { LogoutButton } from './LogoutButton';
import { hasRole } from '@/lib/auth/permissions';

type User = { username:string; fullName:string|null; role:UserRole };
const baseItems=[['/overview','🏠','Overview'],['/live-ops','🚀','Live Ops'],['/customers','🧑‍💼','Clients'],['/reservations','🧳','Mes réservations'],['/ticketing','🎫','Ticketing'],['/manual-payments','🧾','Paiements manuels'],['/post-booking','📂','Post-Booking'],['/flight-ops','🛫','Flight Ops'],['/checkin','✅','Check-in'],['/baggage','🧳','Bagages'],['/inventory','🗂️','Inventaire'],['/flow-tracker','🧭','Flow Tracker']];
export function DoniShell({children,title,active,user}:{children:ReactNode;title:string;active:string;user:User}){
 const items=[...baseItems,...(hasRole(user.role,'ADMIN')?[['/finance','💳','Finance'],['/users','👥','Users'],['/settings','⚙️','Settings'],['/audit','🧾','Audit'],['/migration','🧩','Migration']]:[])];
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="logo">✈️</div><div className="brandText"><strong>Créatif Travel</strong><small>DONI Portal</small></div></div><nav className="nav">{items.map(([href,icon,label])=><Link key={href} href={href} className={active===href?'active':''}><span>{icon}</span> <span className="label">{label}</span></Link>)}</nav></aside><main className="main"><header className="topbar"><div><h1>{title}</h1><div className="userLine">{user.fullName||user.username} · {user.role}</div></div><div className="topActions"><span className="badge ok">Vercel · Phase 35</span><LogoutButton/></div></header><div className="content">{children}</div></main></div>
}
