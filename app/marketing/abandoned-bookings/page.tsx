import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {getAbandonedBookingRecovery} from '@/lib/workspace/marketing-abandoned-booking';
export const dynamic='force-dynamic';

const labels={SEARCH_ABANDONED:'Recherche abandonnée',OFFER_SELECTED:'Offre sélectionnée',CHECKOUT_STARTED:'Checkout commencé',PAYMENT_ABANDONED:'Paiement abandonné'} as const;
function dt(v:string){return new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});}
function money(v:number,c:string){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c,maximumFractionDigits:2}).format(v);}

export default async function Page(){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const d=await getAbandonedBookingRecovery(30);
 return <DoniShell title="Abandoned Booking Recovery" active="/marketing/abandoned-bookings" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Marketing V2.2 · Recovery</span><h2>Récupération des réservations abandonnées</h2><p>DONI détecte automatiquement où le client a quitté le tunnel. Aucune relance n'est envoyée automatiquement : toute offre doit être repricée et approuvée avant contact.</p></div></section>
  <div className="marketingKpis"><div className="card"><span>Abandons · 30 j</span><strong>{d.metrics.total}</strong></div><div className="card"><span>Offre sélectionnée</span><strong>{d.metrics.OFFER_SELECTED}</strong></div><div className="card"><span>Checkout commencé</span><strong>{d.metrics.CHECKOUT_STARTED}</strong></div><div className="card"><span>Paiement abandonné</span><strong>{d.metrics.PAYMENT_ABANDONED}</strong></div></div>
  <section className="card recoveryValueCard"><div><span>Valeur récupérable observée</span><h3>{d.recoverable.length?d.recoverable.map(x=>money(x.amount,x.currency)).join(' · '):'Aucune valeur tarifaire disponible'}</h3><p>Montants basés sur le dernier prix observé ou paiement créé. Repricing obligatoire avant toute proposition.</p></div><div><span>Revenu récupéré</span><h3>{d.recovered.length?d.recovered.map(x=>money(x.amount,x.currency)).join(' · '):'0'}</h3><p>Comptabilisé uniquement lorsque le paiement porte la source <code>abandoned_booking</code>.</p></div></section>
  <section className="card recoveryPipeline"><div className="searchIntelHead"><div><span>Pipeline</span><h3>Opportunités de récupération prioritaires</h3></div><small>Priorité 0–100</small></div>
   <div className="recoveryStageGrid"><div><strong>{d.metrics.SEARCH_ABANDONED}</strong><span>Recherche abandonnée</span></div><div><strong>{d.metrics.OFFER_SELECTED}</strong><span>Offre sélectionnée</span></div><div><strong>{d.metrics.CHECKOUT_STARTED}</strong><span>Checkout commencé</span></div><div><strong>{d.metrics.PAYMENT_ABANDONED}</strong><span>Paiement abandonné</span></div></div>
   <div className="searchHistoryWrap"><table className="searchHistoryTable"><thead><tr><th>Priorité</th><th>Client</th><th>Étape</th><th>Trajet</th><th>Valeur observée</th><th>Paiement</th><th>Dernière activité</th></tr></thead><tbody>{d.opportunities.map(x=><tr key={x.conversationId}><td><span className={`recoveryPriority ${x.priority>=75?'hot':x.priority>=50?'warm':'normal'}`}>{x.priority}</span></td><td><strong>{x.customer.displayName||x.customer.phone||x.waId}</strong><small>{x.customer.country||'Pays non défini'}</small></td><td><span className={`badge ${x.stage==='PAYMENT_ABANDONED'?'warn':'ok'}`}>{labels[x.stage]}</span></td><td><strong>{x.route.origin||'—'} → {x.route.destination||'—'}</strong><small>{x.route.departDate||'Date non définie'}</small></td><td>{x.observedAmount>0?money(x.observedAmount,x.currency):'—'}</td><td>{x.paymentReference||'—'}<small>{x.paymentStatus||'Aucun paiement'}</small></td><td>{dt(x.lastActivityAt)}<small>{x.ageHours} h</small></td></tr>)}</tbody></table></div>
   {!d.opportunities.length?<div className="emptyState">Aucune réservation abandonnée détectée dans les 30 derniers jours.</div>:null}
  </section>
  <section className="card recoveryRules"><span>Règles de sécurité V2.2</span><h3>Recovery assisté, pas autonome</h3><div className="recoveryRuleGrid"><div><strong>1</strong><p>Détecter l'abandon et classer l'intention.</p></div><div><strong>2</strong><p>Repricer l'offre avant toute relance.</p></div><div><strong>3</strong><p>Préparer le message et l'offre récupérée.</p></div><div><strong>4</strong><p>Exiger une validation humaine avant envoi.</p></div></div></section>
 </DoniShell>;
}
