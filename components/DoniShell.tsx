import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { LogoutButton } from './LogoutButton';
import { hasRole } from '@/lib/auth/permissions';

type User = { username:string; fullName:string|null; role:UserRole };
type NavItem={href:string;icon:string;label:string;minimum?:UserRole};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
 {label:'Accueil',items:[
  {href:'/overview',icon:'⌂',label:'Tableau de bord'},
  {href:'/live-ops',icon:'◉',label:'Live Ops'},
 ]},
 {label:'Ventes & Clients',items:[
  {href:'/customers',icon:'◎',label:'Clients / CRM'},
  {href:'/reservations',icon:'✈',label:'Réservations'},
  {href:'/flow-tracker',icon:'↗',label:'Parcours client'},
 ]},
 {label:'Opérations',items:[
  {href:'/ticketing',icon:'▣',label:'Ticketing'},
  {href:'/post-booking',icon:'◇',label:'Post-booking'},
  {href:'/flight-ops',icon:'⌁',label:'Flight Ops'},
  {href:'/checkin',icon:'✓',label:'Check-in'},
  {href:'/baggage',icon:'□',label:'Bagages'},
  {href:'/inventory',icon:'▤',label:'Inventaire'},
 ]},
 {label:'Finance',items:[
  {href:'/manual-payments',icon:'$',label:'Paiements manuels'},
  {href:'/finance',icon:'◫',label:'Centre financier',minimum:'ADMIN'},
 ]},
 {label:'Administration',items:[
  {href:'/users',icon:'♙',label:'Utilisateurs',minimum:'ADMIN'},
  {href:'/settings',icon:'⚙',label:'Paramètres',minimum:'ADMIN'},
  {href:'/audit',icon:'≣',label:'Audit',minimum:'ADMIN'},
  {href:'/migration',icon:'⇄',label:'Migration',minimum:'ADMIN'},
 ]},
];

function roleLabel(role:UserRole){return role==='SUPER_ADMIN'?'Super Admin':role==='ADMIN'?'Admin':'Agent';}
function initials(user:User){const source=(user.fullName||user.username||'D').trim();return source.split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'D';}

export function DoniShell({children,title,active,user}:{children:ReactNode;title:string;active:string;user:User}){
 const visibleGroups=groups.map(group=>({
  ...group,
  items:group.items.filter(item=>!item.minimum||hasRole(user.role,item.minimum)),
 })).filter(group=>group.items.length);
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="logo">D</div><div className="brandText"><strong>DONI</strong><small>Créatif Travel · Operations</small></div></div>
   <nav className="nav" aria-label="Navigation principale">{visibleGroups.map(group=><div className="navGroup" key={group.label}><div className="navGroupLabel">{group.label}</div>{group.items.map(item=><Link key={item.href} href={item.href} className={active===item.href?'active':''}><span className="navIcon" aria-hidden>{item.icon}</span><span className="label">{item.label}</span></Link>)}</div>)}</nav>
   <div className="sidebarProfile"><div className="profileAvatar">{initials(user)}</div><div className="profileCopy"><strong>{user.fullName||user.username}</strong><span>{roleLabel(user.role)}</span></div></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="pageHeading"><div className="eyebrow">DONI Workspace</div><h1>{title}</h1><div className="userLine">Connecté comme {roleLabel(user.role)}</div></div><div className="topActions"><span className="systemPill"><i/>Système opérationnel</span><LogoutButton/></div></header>
   <div className="content">{children}</div>
  </main>
 </div>
}
