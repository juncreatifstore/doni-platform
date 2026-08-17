import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {getMarketingReadiness} from '@/services/workspace/marketing-readiness';
export const dynamic='force-dynamic';

export default async function Page(){
 const user=await requirePageUser('AGENT');
 if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');
 const d=await getMarketingReadiness();
 return <DoniShell title="Marketing V1 · Readiness" active="/marketing/readiness" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Phase 23 · Audit final</span><h2>État de préparation production</h2><p>Contrôle des garde-fous, approbations, droits d'usage, suivi réputation et SLA WhatsApp. Aucun canal externe n'est activé automatiquement par cette page.</p></div><div className={`readinessHero ${d.status==='READY'?'ready':'attention'}`}><span>Statut</span><strong>{d.status==='READY'?'PRÊT':'ATTENTION'}</strong><small>{d.summary.passed}/{d.summary.total} contrôles conformes</small></div></section>
  <div className="marketingKpis"><div className="card"><span>Contrôles</span><strong>{d.summary.total}</strong></div><div className="card"><span>Conformes</span><strong>{d.summary.passed}</strong></div><div className={`card ${d.summary.blocked?'danger':''}`}><span>À traiter</span><strong>{d.summary.blocked}</strong></div><div className="card"><span>Dernier audit</span><strong className="readinessTime">{new Date(d.generatedAt).toLocaleString('fr-FR')}</strong></div></div>
  <section className="card readinessChecks"><h3>Contrôles de production</h3>{d.checks.map(c=><div className="readinessCheck" key={c.key}><span className={c.ok?'checkOk':'checkWarn'}>{c.ok?'✓':'!'}</span><div><strong>{c.label}</strong><small>{c.detail}</small></div></div>)}</section>
  <div className="readinessGrid">
   <section className="card"><h3>Publications bloquées</h3>{d.blockedPublishing.length?d.blockedPublishing.map(x=><div className="readinessRow" key={x.id}><strong>{x.title}</strong><span>{x.status}</span><small>{x.blockers.join(' · ')}</small></div>):<p className="muted">Aucun blocage actif.</p>}</section>
   <section className="card"><h3>Assets à sécuriser</h3>{d.unsafeAssets.length?d.unsafeAssets.map(x=><div className="readinessRow" key={x.id}><strong>{x.title}</strong><small>{x.reason}</small></div>):<p className="muted">Tous les assets actifs sont utilisables.</p>}</section>
   <section className="card"><h3>Avis à traiter</h3>{d.reviewsNeedingResponse.length?d.reviewsNeedingResponse.map(x=><div className="readinessRow" key={x.id}><strong>{x.customerName}</strong><span>{x.rating}/5 · {x.source}</span></div>):<p className="muted">Aucun avis en attente de réponse.</p>}</section>
  </div>
 </DoniShell>;
}
