import {DoniShell} from '@/components/DoniShell';
import {CheckinCenter} from '@/components/operations/CheckinCenter';
import {requirePageUser} from '@/lib/auth/session';
import {listCheckins} from '@/services/operations/checkin';
import {getReservationOverview} from '@/services/post-booking/reservations';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{reference?:string}>}){
  const user=await requirePageUser('AGENT');
  const sp=await searchParams;
  const reference=String(sp?.reference||'').trim().toUpperCase();
  const raw:any[]=await listCheckins();
  const filtered=reference?raw.filter(r=>String(r.tracking?.ticketReference||'').toUpperCase()===reference):raw;
  const rows=filtered.map(r=>({...r,price:r.price==null?null:String(r.price)}));
  const reservation=reference?(await getReservationOverview(reference))[0]||null:null;
  return <DoniShell title="Check-in Center" active="/checkin" user={user}>
    {reference?<div className="card" style={{marginBottom:16}}>
      <strong>Réservation {reference}</strong>
      {!reservation?<p className="muted" style={{marginBottom:0}}>Réservation introuvable.</p>:reservation.checkinEligible?
        <p style={{marginBottom:0}}>✅ Fenêtre check-in disponible. Départ dans environ <strong>{reservation.hoursToDeparture} h</strong>. Les services ci-dessous restent traités par un agent.</p>:
        <p className="muted" style={{marginBottom:0}}>⏳ Check-in pas encore disponible pour cette réservation. Départ dans environ {reservation.hoursToDeparture??'—'} h.</p>}
    </div>:null}
    <CheckinCenter rows={rows}/>
  </DoniShell>;
}
