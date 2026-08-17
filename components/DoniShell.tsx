import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { LogoutButton } from './LogoutButton';
import { NotificationBell } from './workspace/NotificationBell';
import { GlobalSearch } from './workspace/GlobalSearch';
import { hasRole } from '@/lib/auth/permissions';
import { departmentLabel, type Department } from '@/lib/auth/departments';

type User = { username:string; fullName:string|null; role:UserRole; department?:Department|null };
type NavItem={href:string;icon:string;label:string;minimum?:UserRole;departments?:Department[]};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
 {label:'Accueil',items:[
  {href:'/overview',icon:'⌂',label:'Tableau de bord'},
  {href:'/tasks',icon:'✓',label:'Mes tâches'},
  {href:'/cases',icon:'▦',label:'Mes dossiers'},
  {href:'/management',icon:'◆',label:'Cockpit Direction',minimum:'ADMIN'},
  {href:'/productivity',icon:'▥',label:'Productivité équipe',minimum:'ADMIN'},
  {href:'/escalations',icon:'!',label:'Escalades SLA',minimum:'ADMIN'},
  {href:'/live-ops',icon:'◉',label:'Live Ops',departments:['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT','RESERVATIONS']},
 ]},
 {label:'Ventes & Clients',items:[
  {href:'/customers',icon:'◎',label:'Clients / CRM',departments:['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT']},
  {href:'/reservations',icon:'✈',label:'Réservations',departments:['RESERVATIONS','CUSTOMER_SERVICE','TICKETING','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/flow-tracker',icon:'↗',label:'Parcours client',departments:['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT']},
 ]},
 {label:'Service client',items:[
  {href:'/service-client',icon:'◌',label:'Centre service client',departments:['CUSTOMER_SERVICE','OPERATIONS','MANAGEMENT']},
  {href:'/post-booking',icon:'◇',label:'Après-vente',departments:['CUSTOMER_SERVICE','TICKETING','OPERATIONS','MANAGEMENT']},
  {href:'/checkin',icon:'✓',label:'Check-in',departments:['CUSTOMER_SERVICE','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/baggage',icon:'□',label:'Bagages',departments:['CUSTOMER_SERVICE','FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
 ]},
 {label:'Opérations',items:[
  {href:'/ticketing',icon:'▣',label:'Ticketing',departments:['TICKETING','OPERATIONS','MANAGEMENT']},
  {href:'/flight-ops',icon:'⌁',label:'Flight Ops',departments:['FLIGHT_OPS','OPERATIONS','MANAGEMENT']},
  {href:'/inventory',icon:'▤',label:'Inventaire',departments:['RESERVATIONS','OPERATIONS','MANAGEMENT']},
 ]},
 {label:'Finance',items:[
  {href:'/manual-payments',icon:'$',label:'Paiements manuels',departments:['FINANCE','OPERATIONS','MANAGEMENT']},
  {href:'/finance',icon:'◫',label:'Centre financier',departments:['FINANCE','OPERATIONS','MANAGEMENT']},
 ]},
 {label:'Marketing',items:[
  {href:'/marketing',icon:'◇',label:'Dashboard marketing',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/executive',icon:'◆',label:'Cockpit exécutif',minimum:'ADMIN'},
  {href:'/marketing/readiness',icon:'✓',label:'Marketing V1 Readiness',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/team',icon:'♙',label:'Équipe Marketing',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/leads',icon:'◎',label:'Leads & Prospects',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/search-intelligence',icon:'⌕',label:'Search Intelligence',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/abandoned-bookings',icon:'↺',label:'Abandoned Booking Recovery',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/live-offers',icon:'⚡',label:'Live Offers Engine',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/ai-copilot',icon:'✦',label:'DONI Marketing AI Copilot',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/autopilot',icon:'⇥',label:'Marketing Autopilot contrôlé',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/publisher-control',icon:'◉',label:'Publisher Control Center',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/consent',icon:'✓',label:'Consent & Opt-out',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/delivery-analytics',icon:'↗',label:'Delivery & Conversion',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/learning-loop',icon:'∞',label:'Marketing Learning Loop',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/experiments',icon:'A',label:'Controlled Experiments',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/content',icon:'▦',label:'Calendrier contenu',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/studio',icon:'✦',label:'Studio de contenu',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/publishing',icon:'⇧',label:'File de publication',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/assets',icon:'□',label:'Bibliothèque assets',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/reviews',icon:'★',label:'Avis & Réputation',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/referrals',icon:'↻',label:'Parrainage & Fidélisation',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/loyalty',icon:'♥',label:'Fidélité client',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/lifecycle',icon:'∞',label:'Cycle client unifié',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/campaigns',icon:'%',label:'Campagnes & Ads',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/partnerships',icon:'◆',label:'Partenariats & Terrain',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/insights',icon:'◉',label:'Veille & Insights',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/attribution',icon:'⇢',label:'Attribution ventes',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/performance',icon:'↗',label:'Performance',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/channels',icon:'≋',label:'Canaux & Réponse',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/objectives',icon:'✓',label:'Objectifs marketing',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/weekly-review',icon:'≣',label:'Revue hebdomadaire',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/planning',icon:'▤',label:'Planification & Rapports',departments:['MARKETING','MANAGEMENT']},
  {href:'/marketing/seasonality',icon:'◷',label:'Calendrier saisonnier',departments:['MARKETING','MANAGEMENT']},
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
function itemVisible(item:NavItem,user:User){
 if(item.minimum&&!hasRole(user.role,item.minimum))return false;
 if(user.role!=='AGENT')return true;
 if(!item.departments)return true;
 if(!user.department)return true;
 return item.departments.includes(user.department);
}

export function DoniShell({children,title,active,user}:{children:ReactNode;title:string;active:string;user:User}){
 const visibleGroups=groups.map(group=>({...group,items:group.items.filter(item=>itemVisible(item,user))})).filter(group=>group.items.length);
 const dept=departmentLabel(user.department);
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="logo">D</div><div className="brandText"><strong>DONI</strong><small>Créatif Travel · Operations</small></div></div>
   <nav className="nav" aria-label="Navigation principale">{visibleGroups.map(group=><div className="navGroup" key={group.label}><div className="navGroupLabel">{group.label}</div>{group.items.map(item=><Link key={item.href} href={item.href} className={active===item.href?'active':''}><span className="navIcon" aria-hidden>{item.icon}</span><span className="label">{item.label}</span></Link>)}</div>)}</nav>
   <div className="sidebarProfile"><div className="profileAvatar">{initials(user)}</div><div className="profileCopy"><strong>{user.fullName||user.username}</strong><span>{roleLabel(user.role)} · {dept}</span></div></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="pageHeading"><div className="eyebrow">DONI Workspace · {dept}</div><h1>{title}</h1><div className="userLine">{user.fullName||user.username} · {roleLabel(user.role)}</div></div><div className="topActions"><GlobalSearch/><NotificationBell/><span className="systemPill"><i/>Système opérationnel</span><LogoutButton/></div></header>
   <div className="content">{children}</div>
  </main>
 </div>
}
