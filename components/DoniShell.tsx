import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { LogoutButton } from './LogoutButton';
import { NotificationBell } from './workspace/NotificationBell';
import { GlobalSearch } from './workspace/GlobalSearch';
import { PortalQuickAccess } from './workspace/PortalQuickAccess';
import { MobilePortalNav } from './workspace/MobilePortalNav';
import { MobileActionBar } from './workspace/MobileActionBar';
import { hasRole } from '@/lib/auth/permissions';
import { departmentLabel, type Department } from '@/lib/auth/departments';
import type {OrgRole} from '@/lib/auth/org-roles';
import {PORTAL_SECTIONS,portalSectionForPath} from '@/lib/workspace/portal-navigation';
import {getWorkHubMetrics} from '@/services/analytics/work-hub';

type User = { id:string; username:string; fullName:string|null; role:UserRole; orgRole?:OrgRole; country?:string|null; department?:Department|null };
type NavItem={href:string;icon:string;label:string;minimum?:UserRole;departments?:Department[]};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
 {label:'Portail DONI',items:PORTAL_SECTIONS.map(section=>({href:section.href,icon:section.icon,label:section.label,minimum:section.minimum,departments:section.departments}))},
];

function roleLabel(user:User){const role=user.orgRole;if(role==='SUPER_ADMIN')return 'Super Admin';if(role==='COUNTRY_ADMIN')return 'Admin pays';if(role==='SECTION_MANAGER')return 'Responsable de section';if(role==='PARTNER')return 'Partenaire';if(role==='AGENT')return 'Agent';return user.role==='SUPER_ADMIN'?'Super Admin':user.role==='ADMIN'?'Admin pays':'Agent'}
function initials(user:User){const source=(user.fullName||user.username||'D').trim();return source.split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'D';}
function itemVisible(item:NavItem,user:User){
 if(user.orgRole==='PARTNER')return item.href==='/portal/sections/home';
 if(user.orgRole==='SECTION_MANAGER'&&(item.href==='/portal/sections/admin'||item.href==='/users'))return true;
 if(item.minimum&&!hasRole(user.role,item.minimum))return false;
 if(user.orgRole==='SUPER_ADMIN'||user.orgRole==='COUNTRY_ADMIN'||user.role!=='AGENT')return true;
 if(!item.departments)return true;
 if(!user.department)return user.orgRole!=='SECTION_MANAGER';
 return item.departments.includes(user.department);
}
function badgeText(n:number){return n>99?'99+':String(n)}
function sectionBadges(w:Awaited<ReturnType<typeof getWorkHubMetrics>>){return{
 '/portal/sections/sales':w.unassignedAttention+w.pendingPayments,
 '/portal/sections/customer-service':w.unassignedAttention+w.openPostBooking+w.activeCheckins+w.activeBaggage,
 '/portal/sections/operations':w.ticketsToIssue+w.openIncidents+w.activeCheckins+w.activeBaggage,
 '/portal/sections/finance':w.pendingPayments+w.pendingManualReviews,
} as Record<string,number>}

export async function DoniShell({children,title,active,user}:{children:ReactNode;title:string;active:string;user:User}){
 const visibleGroups=groups.map(group=>({...group,items:group.items.filter(item=>itemVisible(item,user))})).filter(group=>group.items.length);
 const dept=departmentLabel(user.department);
 const section=portalSectionForPath(active);
 const portalActive=section?.href||null;
 const isSectionHome=Boolean(section&&active===section.href);
 const contextTools=section?section.tools.filter(tool=>itemVisible(tool,user)).slice(0,4):[];
 const work=user.orgRole==='PARTNER'?null:await getWorkHubMetrics(user).catch(()=>null);
 const badges=work?sectionBadges(work):{};
 const mobileItems=visibleGroups.flatMap(group=>group.items.map(item=>({href:item.href,icon:item.icon,label:item.label,active:active===item.href||portalActive===item.href,badge:badges[item.href]||0})));
 const scopeLabel=user.orgRole==='SUPER_ADMIN'?'Global':user.orgRole==='PARTNER'?'Partenaire':user.country?`${user.country} · ${dept}`:dept;
 return <div className="shell">
  <a className="skipLink" href="#main-content">Aller au contenu principal</a>
  <aside className="sidebar" aria-label="Navigation du portail">
   <div className="brand"><div className="logo" aria-hidden>D</div><div className="brandText"><strong>DONI</strong><small>Créatif Travel · Operations</small></div></div>
   <nav className="nav" aria-label="Navigation principale">{visibleGroups.map(group=><div className="navGroup" key={group.label}><div className="navGroupLabel">{group.label}</div>{group.items.map(item=>{const isActive=active===item.href||portalActive===item.href;const badge=badges[item.href]||0;return <Link key={item.href} href={item.href} className={isActive?'active':''} aria-current={isActive?'page':undefined} title={item.label}><span className="navIcon" aria-hidden>{item.icon}</span><span className="label">{item.label}</span>{badge>0?<span className="navAttentionBadge" aria-label={`${badge} élément${badge>1?'s':''} à traiter`}>{badgeText(badge)}</span>:null}</Link>})}</div>)}</nav>
   <div className="sidebarProfile"><div className="profileAvatar" aria-hidden>{initials(user)}</div><div className="profileCopy"><strong>{user.fullName||user.username}</strong><span>{roleLabel(user)} · {scopeLabel}</span></div></div>
  </aside>
  <main className="main" id="main-content" tabIndex={-1}>
   <header className="topbar"><div className="mobileTopbarLead"><MobilePortalNav items={mobileItems}/><div className="pageHeading"><div className="eyebrow">DONI Workspace · {scopeLabel}</div><h1>{title}</h1><div className="userLine">{user.fullName||user.username} · {roleLabel(user)}</div></div></div><div className="topActions"><GlobalSearch/><PortalQuickAccess active={active} title={title} section={section?.label||null}/><NotificationBell/><span className="systemPill"><i/>Système opérationnel</span><LogoutButton/></div></header>
   <div className="content">
    {section?<nav aria-label="Fil d’Ariane" className="breadcrumbBar"><div className="breadcrumbTrail"><Link href="/portal/sections/home">DONI</Link><span aria-hidden>›</span><Link href={section.href}>{section.label}</Link>{!isSectionHome?<><span aria-hidden>›</span><strong aria-current="page">{title}</strong></>:null}</div>{!isSectionHome?<Link className="btn" href={section.href}>← Retour à {section.label}</Link>:null}</nav>:null}
    {section&&!isSectionHome&&contextTools.length?<nav className="sectionContextBar" aria-label={`Actions rapides · ${section.label}`}><span className="sectionContextLabel">Actions rapides</span><div className="sectionContextLinks">{contextTools.map(tool=>{const isCurrent=active===tool.href||active.startsWith(`${tool.href}/`);return <Link key={tool.href} href={tool.href} className={isCurrent?'active':''} aria-current={isCurrent?'page':undefined}><span aria-hidden>{tool.icon}</span><span>{tool.label}</span></Link>})}</div></nav>:null}
    {children}
   </div>
   <MobileActionBar/>
  </main>
 </div>
}
