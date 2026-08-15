import { DoniShell } from '@/components/DoniShell';
import { requirePageUser } from '@/lib/auth/session';
import { listPostBooking } from '@/services/post-booking/service';
import { AutoRefresh } from '@/components/analytics/AutoRefresh';

export const dynamic = 'force-dynamic';

const labels:Record<string,string>={
  cancellation:'Annulation',
  name_correction:'Correction de nom',
  flight_change:'Changement de vol',
  payment_method_change:'Changement de paiement',
  other:'Autre demande',
  request_created:'Créée',
  waiting_admin_review:'Revue admin',
  waiting_airline_confirmation:'Attente compagnie',
  penalty_pending:'Pénalité en attente',
  waiting_customer_payment:'Paiement client',
  approved:'Approuvée',
  rejected:'Refusée',
  completed:'Terminée',
};

function statusBadge(status:string){
  if(['approved','completed'].includes(status)) return 'badge ok';
  if(status==='rejected') return 'badge bad';
  if(['waiting_airline_confirmation','penalty_pending','waiting_customer_payment','waiting_admin_review'].includes(status)) return 'badge warn';
  return 'badge';
}

export default async function PostBookingPage(){
  const user = await requirePageUser('AGENT');
  const rows = await listPostBooking();
  const open = rows.filter((r:any)=>!['approved','rejected','completed'].includes(r.status)).length;
  const waitingAirline = rows.filter((r:any)=>r.status==='waiting_airline_confirmation').length;
  const waitingPayment = rows.filter((r:any)=>r.status==='waiting_customer_payment').length;

  return (
    <DoniShell title="Post-Booking" active="/post-booking" user={user}>
      <AutoRefresh seconds={30}/>

      <div className="grid">
        <div className="metric card"><span className="metricLabel">Demandes ouvertes</span><strong className="metricValue">{open}</strong><small className="muted">{rows.length} au total</small></div>
        <div className="metric card"><span className="metricLabel">Attente compagnie</span><strong className="metricValue">{waitingAirline}</strong><small className="muted">Réponse fournisseur requise</small></div>
        <div className="metric card"><span className="metricLabel">Paiements client</span><strong className="metricValue">{waitingPayment}</strong><small className="muted">Frais/penalités à encaisser</small></div>
      </div>

      <h2 className="sectionTitle">Demandes après émission</h2>
      <div className="card tableWrap">
        <table className="table">
          <thead><tr><th>Référence</th><th>Type</th><th>Statut</th><th>Priorité</th><th>Téléphone</th><th>Pénalité</th><th>Créée</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r:any)=><tr key={r.id}>
              <td><strong>{r.reference}</strong></td>
              <td>{labels[r.requestType]||r.requestType}</td>
              <td><span className={statusBadge(r.status)}>{labels[r.status]||r.status}</span></td>
              <td>{r.priority||'—'}</td>
              <td>{r.phone||'—'}</td>
              <td>{r.penaltyAmount!=null?`${Number(r.penaltyAmount).toFixed(2)} ${r.penaltyCurrency||'USD'}`:'—'}</td>
              <td>{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
            </tr>) : <tr><td colSpan={7} className="muted">Aucune demande post-booking pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{marginTop:16}}>
        <strong>Fonctions disponibles</strong>
        <p className="muted" style={{marginBottom:0}}>Annulation, correction de nom, changement de vol, changement de méthode de paiement, suivi des pénalités, confirmation compagnie et traitement des remboursements sont déjà pris en charge par le backend DONI.</p>
      </div>
    </DoniShell>
  );
}
