import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {portalSectionBySlug} from '@/lib/workspace/portal-navigation';
export const dynamic='force-dynamic';

function permitted(item:{minimum?:any;departments?:any[]},user:{role:any;department?:any}){
 if(item.minimum&&!hasRole(user.role,item.minimum))return false;
 if(user.role!=='AGENT')return true;
 if(!item.departments||!item.departments.length)return true;
 if(!user.department)return true;
 return item.departments.includes(user.department);
}

export default async function Page({params}:{params:Promise<{section:string}>}){
 const {section:slug}=await params;const section=portalSectionBySlug(slug);if(!section)notFound();
 const user=await requirePageUser('AGENT');
 if(!permitted(section,user))redirect('/overview?forbidden=1');
 const tools=section.tools.filter(tool=>permitted(tool,user));
 return <DoniShell title={section.label} active={section.href} user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">DONI Portal · Navigation simplifiée</span><h2>{section.icon} {section.label}</h2><p>{section.description}</p></div></section>
  <section className="card"><div className="searchIntelHead"><div><span>Espace {section.label}</span><h3>Choisir un outil</h3></div><small>{tools.length} outil{tools.length>1?'s':''} disponible{tools.length>1?'s':''}</small></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:16}}>{tools.map(tool=><Link key={tool.href} href={tool.href} style={{textDecoration:'none',color:'inherit'}}><article className="card" style={{height:'100%',padding:18,display:'grid',gap:10,alignContent:'start'}}><div style={{display:'flex',alignItems:'center',gap:12}}><span className="navIcon" style={{display:'inline-flex',width:42,height:42,alignItems:'center',justifyContent:'center',fontSize:20}} aria-hidden>{tool.icon}</span><h3 style={{margin:0}}>{tool.label}</h3></div><p className="muted" style={{margin:0}}>{tool.description}</p><strong style={{marginTop:6}}>Ouvrir →</strong></article></Link>)}</div>
   {!tools.length?<p className="muted">Aucun outil disponible pour ton rôle dans cette section.</p>:null}
  </section>
 </DoniShell>;
}
