import {DoniShell} from '@/components/DoniShell';
import {ReservationActions} from '@/components/reservations/ReservationActions';
import {requirePageUser} from '@/lib/auth/session';
import {getReservationOverview} from '@/services/post-booking/reservations';

export const dynamic='force-dynamic';

function fmtDate(v:any){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});}
function money(v:any,c?:string){const n=Number(v);if(!Number.isFinite(n))return '—';try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c||'USD'}).format(n)}catch{return `${n.toFixed(2)} ${c||''}`}}
function statusTone(v:any){const s=String(v||'').toLowerCase();return ['delayed','cancelled','diverted'].includes(s)?'bad':s==='landed'?'ok':'';}

export default async function ReservationsPage(){
  const user=await requirePageUser('AGENT');
  const rows=await getReservationOverview();
  return <DoniShell title="Mes réservations" active="/reservations" user={user}>
    <div className="card" style={{marginBottom:16}}>
      <strong>Post-booking client</strong>
      <p className="muted" style={{marginBottom:0}}>Consultez les billets émis, leurs PNR par segment, le suivi de vol et les actions disponibles. Le check-in dépend de la fenêtre de départ, tandis que le renvoi d’un e-ticket reste protégé par le garde-fou de livraison.</p>
    </div>

    {!rows.length?<div className="card"><span className="muted">Aucune réservation émise.</span></div>:rows.map((r:any)=><div className="card" key={r.reference} style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div>
          <div className="muted" style={{fontSize:12}}>Référence DONI</div>
          <h2 style={{margin:'4px 0 6px'}}>{r.reference}</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span className="badge ok">{r.status}</span>
            <span className="badge">Livraison: {r.deliveryStatus||'PENDING'}</span>
            <span className={`badge ${r.trackingReady?'ok':'warn'}`}>Tracking: {r.trackingReady?'Prêt':'Non prêt'}</span>
            {r.hasDisruption?<span className="badge bad">⚠️ Perturbation détectée</span>:<span className="badge ok">Vol normal</span>}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="muted" style={{fontSize:12}}>Total</div>
          <strong style={{fontSize:20}}>{money(r.total,r.currency)}</strong>
          <div className="muted" style={{fontSize:12,marginTop:4}}>Émis: {fmtDate(r.issuedAt)}</div>
        </div>
      </div>

      <h3 className="sectionTitle" style={{marginTop:22}}>Passager(s)</h3>
      <div className="tableWrap"><table className="table"><thead><tr><th>Nom</th><th>Type</th><th>Document</th><th>Nationalité</th></tr></thead><tbody>{(r.passengers||[]).map((p:any,i:number)=><tr key={i}><td>{`${p.firstName||''} ${p.lastName||''}`.trim()||'—'}</td><td>{p.type||'Adult'}</td><td>{p.documentNumber||'—'}</td><td>{p.nationality||'—'}</td></tr>)}</tbody></table></div>

      <h3 className="sectionTitle" style={{marginTop:22}}>Itinéraire & suivi</h3>
      <div className="tableWrap"><table className="table"><thead><tr><th>Vol</th><th>Trajet</th><th>Départ prévu</th><th>Départ estimé</th><th>PNR segment</th><th>Statut</th><th>Retard</th><th>Porte / Terminal</th></tr></thead><tbody>{(r.segments||[]).map((s:any,i:number)=>{const tr=(r.tracking||[])[i];return <tr key={i}><td>{`${s.airline||''} ${s.flightNumber||''}`.trim()||'—'}</td><td>{s.origin||'—'} → {s.destination||'—'}</td><td>{fmtDate(s.departureAt)}</td><td>{fmtDate(tr?.estimatedDeparture)}</td><td><strong>{s.pnr||s.bookingReference||r.pnr||'—'}</strong></td><td><span className={`badge ${statusTone(tr?.flightStatus)}`}>{tr?.flightStatus||'scheduled'}</span></td><td>{Number(tr?.delayMinutes||0)>0?`${tr.delayMinutes} min`:'—'}</td><td>{tr?.gate||'—'} / {tr?.terminal||'—'}</td></tr>})}</tbody></table></div>

      <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid #e2e8f0'}}>
        <ReservationActions reference={r.reference} checkinEligible={Boolean(r.checkinEligible)} trackingReady={Boolean(r.trackingReady)} resendEnabled={Boolean(r.resendEnabled)}/>
        <div className="muted" style={{fontSize:12,marginTop:10}}>
          {r.checkinWindow==='OPEN'?`Check-in disponible · départ dans environ ${r.hoursToDeparture} h`:r.checkinWindow==='NOT_OPEN_YET'?`Check-in pas encore ouvert · départ dans environ ${r.hoursToDeparture} h`:'Check-in fermé ou vol déjà parti'}
          {' · '}Renvoi e-ticket: {r.resendEnabled?'AUTORISÉ':'VERROUILLÉ'} · Alertes auto: {r.alertsEnabled?'ON':'OFF'} · Alertes disruption: {r.disruptionAlertsEnabled?'ON':'OFF'}
        </div>
      </div>
    </div>)}
  </DoniShell>;
}
