import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {hasRole} from '@/lib/auth/permissions';
import {getMarketingSection} from '@/lib/workspace/marketing-navigation';
export const dynamic='force-dynamic';

export default async function Page({params}:{params:Promise<{section:string}>}){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const {section:key}=await params;const section=getMarketingSection(key);if(!section)notFound();
 const tools=section.tools.filter(tool=>!tool.minimum||hasRole(user.role,tool.minimum));
 return <DoniShell title={`Marketing · ${section.label}`} active={section.href} user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Marketing · Navigation simplifiée</span><h2>{section.icon} {section.label}</h2><p>{section.description}</p></div><div><Link className="btn" href="/marketing/sections/overview">← Vue d’ensemble</Link></div></section>
  <section className="card">
   <div className="searchIntelHead"><div><span>{tools.length} outils</span><h3>Choisir un espace de travail</h3></div><small>Chaque outil conserve son écran et son URL existants</small></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,marginTop:18}}>
    {tools.map(tool=><Link key={tool.href} href={tool.href} style={{textDecoration:'none',color:'inherit'}}><article className="card" style={{height:'100%',padding:20,display:'grid',gap:10,alignContent:'start',cursor:'pointer'}}><div style={{fontSize:28}}>{tool.icon}</div><h3 style={{margin:0}}>{tool.label}</h3><p className="muted" style={{margin:0,lineHeight:1.5}}>{tool.description}</p><span style={{marginTop:6,fontWeight:700}}>Ouvrir →</span></article></Link>)}
   </div>
  </section>
 </DoniShell>;
}
