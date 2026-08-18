import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UserRole } from '@prisma/client';
import { LogoutButton } from './LogoutButton';
import { NotificationBell } from './workspace/NotificationBell';
import { GlobalSearch } from './workspace/GlobalSearch';
import { PortalQuickAccess } from './workspace/PortalQuickAccess';
import { MobilePortalNav } from './workspace/MobilePortalNav';
import { hasRole } from '@/lib/auth/permissions';
import { departmentLabel, type Department } from '@/lib/auth/departments';
import {PORTAL_SECTIONS,portalSectionForPath} from '@/lib/workspace/portal-navigation';

type User = { username:string; fullName:string|null; role:UserRole; department?:Department|null };
type NavItem={href:string;icon:string;label:string;minimum?:UserRole;departments?:Department[]};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
 {label:'Portail DONI',items:PORTAL_SECTIONS.map(section=>({href:section.href,icon:section.icon,label:section.label,minimum:section.minimum,departments:section.departments}))},
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
 const section=portalSectionForPath(active);
 const portalActive=section?.href||null;
 const isSectionHome=Boolean(section&&active===section.href);
 const mobileItems=visibleGroups.flatMap(group=>group.items.map(item=>({href:item.href,icon:item.icon,label:item.label,active:active===item.href||portalActive===item.href})));
 return <div className="shell">
  <a className="skipLink" href="#main-content">Aller au contenu principal</a>
  <aside className="sidebar" aria-label="Navigation du portail">
   <div className="brand"><div className="logo" aria-hidden>D</div><div className="brandText"><strong>DONI</strong><small>Créatif Travel · Operations</small></div></div>
   <nav className="nav" aria-label="Navigation principale">{visibleGroups.map(group=><div className="navGroup" key={group.label}><div className="navGroupLabel">{group.label}</div>{group.items.map(item=>{const isActive=active===item.href||portalActive===item.href;return <Link key={item.href} href={item.href} className={isActive?'active':''} aria-current={isActive?'page':undefined} title={item.label}><span className="navIcon" aria-hidden>{item.icon}</span><span className="label">{item.label}</span></Link>})}</div>)}</nav>
   <div className="sidebarProfile"><div className="profileAvatar" aria-hidden>{initials(user)}</div><div className="profileCopy"><strong>{user.fullName||user.username}</strong><span>{roleLabel(user.role)} · {dept}</span></div></div>
  </aside>
  <main className="main" id="main-content" tabIndex={-1}>
   <header className="topbar"><div className="mobileTopbarLead"><MobilePortalNav items={mobileItems}/><div className="pageHeading"><div className="eyebrow">DONI Workspace · {dept}</div><h1>{title}</h1><div className="userLine">{user.fullName||user.username} · {roleLabel(user.role)}</div></div></div><div className="topActions"><GlobalSearch/><PortalQuickAccess active={active} title={title} section={section?.label||null}/><NotificationBell/><span className="systemPill"><i/>Système opérationnel</span><LogoutButton/></div></header>
   <div className="content">
    {section?<nav aria-label="Fil d’Ariane" className="breadcrumbBar"><div className="breadcrumbTrail"><Link href="/portal/sections/home">DONI</Link><span aria-hidden>›</span><Link href={section.href}>{section.label}</Link>{!isSectionHome?<><span aria-hidden>›</span><strong aria-current="page">{title}</strong></>:null}</div>{!isSectionHome?<Link className="btn" href={section.href}>← Retour à {section.label}</Link>:null}</nav>:null}
    {children}
   </div>
  </main>
 </div>
}
