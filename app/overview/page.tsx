import Link from 'next/link';
import { DoniShell } from '@/components/DoniShell';
import { requirePageUser } from '@/lib/auth/session';
import { hasRole } from '@/lib/auth/permissions';
import { getOverviewMetrics } from '@/services/analytics/dashboard';
import { MetricCard } from '@/components/analytics/MetricCard';
import { AutoRefresh } from '@/components/analytics/AutoRefresh';
export const dynamic='force-dynamic';
function money(n:number,c:string){try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c,maximumFractionDigits:2}).format(n)}catch{return `${n.toFixed(2)} ${c}`}}
export default async function Overview(){
 const user=await requirePageUser('AGENT');
 const d=await getOverviewMetrics();
 const priorities=[
  {label:'Conversations à reprendre',value:d.agentRequired,href:'/live-ops',tone:d.agentRequired?'urgent':'clear'},
  {label:'Paiements à vérifier',value:d.pendingPayments,href:'/manual-payments',tone:d.pendingPayments?'attention':'clear'},
  {label:'Billets à émettre',value:d.ticketsToIssue,href:'/ticketing',tone:d.ticketsToIssue?'attention':'clear'},
  {label:'Incidents opérationnels',value:d.stalled+d.deliveryFailures,href:'/flight-ops',tone:d.stalled+d.deliveryFailures?'urgent':'clear'},
 ];
 const quick=[
  {href:'/live-ops',icon:'◉',label:'Ouvrir Live Ops',note:'Conversations et interventions'},
  {href:'/reservations',icon:'✈',label:'Réservations',note:'Consulter les dossiers clients'},
  {href:'/ticketing',icon:'▣',label:'Ticketing',note:'Émission et suivi des billets'},
  {href:'/customers',icon:'◎',label:'Clients / CRM',note:'Historique et dossiers clients'},
  ...(hasRole(user.role,'ADMIN')?[{href:'/finance',icon:'$',label:'Finance',note:'Encaissements et contrôle'}]:[]),
 ];
 return <DoniShell title="Tableau de bord" active="/overview" user={user}>
  <AutoRefresh seconds={30}/>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Centre de travail</span><h2>Bonjour {user.fullName?.split(' ')[0]||user.username}</h2><p>Voici les dossiers qui demandent votre attention et l’état actuel des opérations DONI.</p></div><div className="workspaceRole">{user.role==='SUPER_ADMIN'?'Super Admin':user.role==='ADMIN'?'Administration':'Agent opérationnel'}</div></section>
  <div className="priorityGrid">{priorities.map(p=><Link href={p.href} className={`priorityCard ${p.tone}`} key={p.label}><span>{p.label}</span><strong>{p.value}</strong><small>{p.value?'À traiter':'Aucune action requise'} →</small></Link>)}</div>
  <h2 className="sectionTitle">Performance opérationnelle</h2>
  <div className="grid"><MetricCard label="Conversations actives" value={d.active} note={`${d.agentRequired} requièrent un agent`} tone={d.agentRequired?'warn':'good'}/><MetricCard label="Paiements en attente" value={d.pendingPayments} note={`${d.paid24h} payés / 24 h`}/><MetricCard label="Tickets à émettre" value={d.ticketsToIssue} note={`${d.issued24h} émis / 24 h`} tone={d.ticketsToIssue?'warn':'good'}/><MetricCard label="Alertes opérationnelles" value={d.stalled+d.deliveryFailures} note={`${d.stalled} bloquées · ${d.deliveryFailures} livraisons`} tone={d.stalled+d.deliveryFailures?'bad':'good'}/></div>
  <h2 className="sectionTitle">Accès rapide</h2><div className="quickWorkspace">{quick.map(q=><Link href={q.href} key={q.href} className="quickWorkspaceCard"><span className="quickWorkspaceIcon">{q.icon}</span><div><strong>{q.label}</strong><small>{q.note}</small></div><b>›</b></Link>)}</div>
  <div className="workspaceColumns"><section><h2 className="sectionTitle">Encaissements · 24 h</h2><div className="card"><div className="moneyStrip">{d.revenue24h.length?d.revenue24h.map(x=><div key={x.currency}><span>{x.currency}</span><strong>{money(x.amount,x.currency)}</strong></div>):<span className="muted">Aucun paiement encaissé sur les 24 dernières heures.</span>}</div></div></section><section><h2 className="sectionTitle">Résumé équipe</h2><div className="card teamSnapshot"><div><span>Automatisées</span><strong>{Math.max(0,d.active-d.agentRequired)}</strong></div><div><span>Intervention agent</span><strong>{d.agentRequired}</strong></div><div><span>Tickets émis / 24 h</span><strong>{d.issued24h}</strong></div></div></section></div>
  <h2 className="sectionTitle">Conversations récentes</h2><div className="card tableWrap"><table className="table"><thead><tr><th>WhatsApp</th><th>Pays</th><th>Langue</th><th>Étape</th><th>Agent</th><th>Dernière activité</th></tr></thead><tbody>{d.recentConversations.map(c=><tr key={c.id}><td>{c.waId}</td><td>{c.country||'—'}</td><td>{c.language||'—'}</td><td><code>{c.currentSegment}</code></td><td>{c.agentRequired?<span className="badge warn">Requis</span>:<span className="badge ok">Auto</span>}</td><td>{c.updatedAt.toLocaleString('fr-FR')}</td></tr>)}</tbody></table></div>
 </DoniShell>
}
