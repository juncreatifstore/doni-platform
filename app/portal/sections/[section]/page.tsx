import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {PageState} from '@/components/workspace/PageState';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {portalSectionBySlug} from '@/lib/workspace/portal-navigation';
import {getWorkHubMetrics} from '@/services/analytics/work-hub';
export const dynamic='force-dynamic';

function permitted(item:{minimum?:any;departments?:any[]},user:{role:any;department?:any}){
 if(item.minimum&&!hasRole(user.role,item.minimum))return false;
 if(user.role!=='AGENT')return true;
 if(!item.departments||!item.departments.length)return true;
 if(!user.department)return true;
 return item.departments.includes(user.department);
}

type WorkItem={label:string;value:number;href:string;note:string;tone:'urgent'|'attention'|'clear'};
type QuickAction={href:string;icon:string;label:string;note:string};
function workItems(w:Awaited<ReturnType<typeof getWorkHubMetrics>>):WorkItem[]{
 if(w.dept==='CUSTOMER_SERVICE')return[
  {label:'Conversations à reprendre',value:w.myAttentionConversations||w.unassignedAttention,href:'/live-ops',note:'Intervention client requise',tone:(w.myAttentionConversations||w.unassignedAttention)?'urgent':'clear'},
  {label:'Après-vente ouverts',value:w.openPostBooking,href:'/post-booking',note:'Demandes non clôturées',tone:w.openPostBooking?'attention':'clear'},
  {label:'Check-in à suivre',value:w.activeCheckins,href:'/checkin',note:'Services actifs',tone:w.activeCheckins?'attention':'clear'},
  {label:'Bagages à suivre',value:w.activeBaggage,href:'/baggage',note:'Demandes en cours',tone:w.activeBaggage?'attention':'clear'},
 ];
 if(w.dept==='FINANCE')return[
  {label:'Paiements en attente',value:w.pendingPayments,href:'/finance',note:'Transactions à contrôler',tone:w.pendingPayments?'urgent':'clear'},
  {label:'Reçus à vérifier',value:w.pendingManualReviews,href:'/manual-payments',note:'Contrôle manuel requis',tone:w.pendingManualReviews?'urgent':'clear'},
  {label:'Conversations bloquées',value:w.stalledConversations,href:'/live-ops',note:'Plus de 15 minutes sans progression',tone:w.stalledConversations?'attention':'clear'},
  {label:'Billets à émettre',value:w.ticketsToIssue,href:'/ticketing',note:'Dossiers payés à finaliser',tone:w.ticketsToIssue?'attention':'clear'},
 ];
 if(w.dept==='TICKETING')return[
  {label:'Billets à émettre',value:w.ticketsToIssue,href:'/ticketing',note:'File d’émission active',tone:w.ticketsToIssue?'urgent':'clear'},
  {label:'Paiements en attente',value:w.pendingPayments,href:'/reservations',note:'Vérifier avant émission',tone:w.pendingPayments?'attention':'clear'},
  {label:'Après-vente ouverts',value:w.openPostBooking,href:'/post-booking',note:'Demandes liées aux billets',tone:w.openPostBooking?'attention':'clear'},
  {label:'Dossiers sans progression',value:w.stalledConversations,href:'/live-ops',note:'À reprendre',tone:w.stalledConversations?'attention':'clear'},
 ];
 if(w.dept==='FLIGHT_OPS')return[
  {label:'Incidents ouverts',value:w.openIncidents,href:'/flight-ops',note:'Intervention opérationnelle',tone:w.openIncidents?'urgent':'clear'},
  {label:'Check-in à suivre',value:w.activeCheckins,href:'/checkin',note:'Services actifs',tone:w.activeCheckins?'attention':'clear'},
  {label:'Bagages à suivre',value:w.activeBaggage,href:'/baggage',note:'Demandes actives',tone:w.activeBaggage?'attention':'clear'},
  {label:'Dossiers sans progression',value:w.stalledConversations,href:'/live-ops',note:'Plus de 15 minutes',tone:w.stalledConversations?'attention':'clear'},
 ];
 if(w.dept==='RESERVATIONS')return[
  {label:'Mes conversations actives',value:w.myActiveConversations,href:'/live-ops',note:'Clients actuellement assignés',tone:w.myAttentionConversations?'urgent':'clear'},
  {label:'Clients sans agent',value:w.unassignedAttention,href:'/live-ops',note:'À prendre en charge',tone:w.unassignedAttention?'urgent':'clear'},
  {label:'Paiements en attente',value:w.pendingPayments,href:'/reservations',note:'Réservations à avancer',tone:w.pendingPayments?'attention':'clear'},
  {label:'Billets à émettre',value:w.ticketsToIssue,href:'/ticketing',note:'Dossiers à finaliser',tone:w.ticketsToIssue?'attention':'clear'},
 ];
 return[
  {label:'Clients sans agent',value:w.unassignedAttention,href:'/live-ops',note:'Intervention requise',tone:w.unassignedAttention?'urgent':'clear'},
  {label:'Paiements en attente',value:w.pendingPayments,href:'/finance',note:'À contrôler',tone:w.pendingPayments?'attention':'clear'},
  {label:'Billets à émettre',value:w.ticketsToIssue,href:'/ticketing',note:'À finaliser',tone:w.ticketsToIssue?'attention':'clear'},
  {label:'Incidents ouverts',value:w.openIncidents,href:'/flight-ops',note:'Opérations à surveiller',tone:w.openIncidents?'urgent':'clear'},
 ];
}
function quickActions(slug:string):QuickAction[]{
 const map:Record<string,QuickAction[]>={
  sales:[
   {href:'/reservations',icon:'✈',label:'Réservations',note:'Ouvrir et avancer les dossiers voyage'},
   {href:'/customers',icon:'◎',label:'Rechercher un client',note:'Accéder rapidement au CRM'},
   {href:'/flow-tracker',icon:'↗',label:'Parcours client',note:'Voir où se trouve le client dans le funnel'},
  ],
  'customer-service':[
   {href:'/live-ops',icon:'◉',label:'Reprendre une conversation',note:'Accéder aux clients qui nécessitent une intervention'},
   {href:'/post-booking',icon:'◇',label:'Après-vente',note:'Traiter modification, annulation et assistance'},
   {href:'/checkin',icon:'✓',label:'Check-in',note:'Suivre les enregistrements en cours'},
   {href:'/baggage',icon:'□',label:'Bagages',note:'Traiter les demandes bagages'},
  ],
  operations:[
   {href:'/ticketing',icon:'▣',label:'Ticketing',note:'Émettre et contrôler les billets'},
   {href:'/flight-ops',icon:'⌁',label:'Flight Ops',note:'Surveiller vols et incidents'},
   {href:'/inventory',icon:'▤',label:'Inventaire',note:'Consulter les disponibilités manuelles'},
  ],
  finance:[
   {href:'/manual-payments',icon:'$',label:'Paiements à vérifier',note:'Contrôler rapidement les reçus manuels'},
   {href:'/finance',icon:'◫',label:'Centre financier',note:'Suivre encaissements, remboursements et anomalies'},
  ],
  marketing:[
   {href:'/marketing/sections/campaigns',icon:'%',label:'Campagnes & Ads',note:'Créer, publier et superviser les campagnes'},
   {href:'/marketing/sections/acquisition',icon:'🎯',label:'Acquisition',note:'Leads, demandes et opportunités commerciales'},
   {href:'/marketing/sections/ai',icon:'✦',label:'DONI AI',note:'Copilot, Autopilot et automatisation contrôlée'},
   {href:'/marketing/sections/analytics',icon:'↗',label:'Analyse & Planning',note:'Performance, objectifs et rapports'},
  ],
  admin:[
   {href:'/users',icon:'♙',label:'Utilisateurs',note:'Gérer comptes, rôles et accès'},
   {href:'/settings',icon:'⚙',label:'Paramètres',note:'Configurer les services DONI'},
   {href:'/audit',icon:'≣',label:'Audit',note:'Contrôler l’historique des actions'},
  ],
 };
 return map[slug]||[];
}

export default async function Page({params}:{params:Promise<{section:string}>}){
 const {section:slug}=await params;const section=portalSectionBySlug(slug);if(!section)notFound();
 const user=await requirePageUser('AGENT');
 if(!permitted(section,user))redirect('/overview?forbidden=1');
 const tools=section.tools.filter(tool=>permitted(tool,user));
 const toolHrefSet=new Set(tools.map(x=>x.href));
 const work=slug==='home'?await getWorkHubMetrics(user):null;
 const today=work?workItems(work):[];
 const actions=quickActions(slug).filter(a=>toolHrefSet.has(a.href)||user.role!=='AGENT');
 return <DoniShell title={section.label} active={section.href} user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">{slug==='home'?'DONI Work Hub':'DONI Portal · Espace de travail'}</span><h2>{section.icon} {slug==='home'?'Mon travail aujourd’hui':section.label}</h2><p>{slug==='home'?'Les actions prioritaires sont affichées en premier. Ouvre directement la file concernée et avance sans chercher dans le portail.':section.description}</p></div></section>
  {work?<><div className="priorityGrid">{today.map(item=><Link href={item.href} className={`priorityCard ${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.value?item.note:'Aucune action requise'} →</small></Link>)}</div><div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'16px 0 22px'}}><Link className="primaryButton" href="/tasks">✓ Mes tâches</Link><Link className="btn" href="/cases">▦ Mes dossiers</Link>{user.role!=='AGENT'?<Link className="btn" href="/escalations">! Escalades SLA</Link>:null}<Link className="btn" href="/live-ops">◉ Live Ops</Link></div></>:null}
  {!work&&actions.length?<section className="card" style={{marginBottom:18}}><div className="searchIntelHead"><div><span>Accès immédiat</span><h3>Actions fréquentes</h3></div><small>Les tâches les plus utilisées de cette section</small></div><div className="quickWorkspace" style={{marginTop:14}}>{actions.map(a=><Link href={a.href} key={a.href} className="quickWorkspaceCard"><span className="quickWorkspaceIcon">{a.icon}</span><div><strong>{a.label}</strong><small>{a.note}</small></div><b>›</b></Link>)}</div></section>:null}
  <section className="card"><div className="searchIntelHead"><div><span>{slug==='home'?'Accès essentiels':`Espace ${section.label}`}</span><h3>{slug==='home'?'Outils de travail':'Tous les outils'}</h3></div><small>{tools.length} outil{tools.length>1?'s':''} disponible{tools.length>1?'s':''}</small></div>
   {tools.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:16}}>{tools.map(tool=><Link key={tool.href} href={tool.href} style={{textDecoration:'none',color:'inherit'}}><article className="card" style={{height:'100%',padding:18,display:'grid',gap:10,alignContent:'start'}}><div style={{display:'flex',alignItems:'center',gap:12}}><span className="navIcon" style={{display:'inline-flex',width:42,height:42,alignItems:'center',justifyContent:'center',fontSize:20}} aria-hidden>{tool.icon}</span><h3 style={{margin:0}}>{tool.label}</h3></div><p className="muted" style={{margin:0}}>{tool.description}</p><strong style={{marginTop:6}}>Ouvrir →</strong></article></Link>)}</div>:<div style={{marginTop:16}}><PageState title="Aucun outil disponible" message="Ton rôle ou ton département ne donne actuellement accès à aucun outil dans cette section. Choisis une autre section du portail pour continuer." actionHref="/portal/sections/home" actionLabel="Retour à l’accueil"/></div>}
  </section>
 </DoniShell>;
}
