import {db} from '@/lib/db';
import {normalizeTicketPayload} from '@/services/ticketing/types';
import {getSetting} from '@/lib/settings/service';

export async function getReservationOverview(reference?:string){
  const where:any={status:'ISSUED'};
  if(reference) where.reference=reference.trim().toUpperCase();
  const tickets=await (db as any).ticket.findMany({where,include:{conversation:true},orderBy:{issuedAt:'desc'},take:reference?1:50});
  const alertsEnabled=await getSetting<boolean>('tracking.alerts_enabled');
  const disruptionAlertsEnabled=await getSetting<boolean>('tracking.disruption_alerts_enabled');
  const rows=[] as any[];
  for(const t of tickets){
    const payload:any=normalizeTicketPayload(t.payload);
    const tracking=await (db as any).flightTracking.findMany({where:{ticketReference:t.reference},orderBy:{scheduledDeparture:'asc'}}).catch(()=>[]);
    const nextDeparture=(payload.segments||[]).map((s:any)=>new Date(s.departureAt||0)).filter((d:Date)=>!Number.isNaN(d.getTime())&&d.getTime()>Date.now()).sort((a:Date,b:Date)=>a.getTime()-b.getTime())[0]||null;
    const hoursToDeparture=nextDeparture?(nextDeparture.getTime()-Date.now())/3600000:null;
    rows.push({
      reference:t.reference,
      status:t.status,
      pnr:t.pnr,
      ticketNumber:t.ticketNumber,
      issuedAt:t.issuedAt,
      deliveryStatus:t.deliveryStatus,
      passengers:payload.passengers||[],
      segments:payload.segments||[],
      contact:payload.contact||{},
      total:payload.total,
      currency:payload.currency,
      tracking:tracking.map((x:any)=>({id:x.id,airlineCode:x.airlineCode,flightNumber:x.flightNumber,origin:x.origin,destination:x.destination,scheduledDeparture:x.scheduledDeparture,scheduledArrival:x.scheduledArrival,flightStatus:x.flightStatus,active:x.active,nextCheckAt:x.nextCheckAt})),
      trackingCount:tracking.length,
      trackingReady:tracking.length>0,
      canResendEticket:t.status==='ISSUED',
      checkinEligible:hoursToDeparture!==null&&hoursToDeparture>0&&hoursToDeparture<=48,
      hoursToDeparture:hoursToDeparture===null?null:Math.round(hoursToDeparture*10)/10,
      alertsEnabled:alertsEnabled===true,
      disruptionAlertsEnabled:disruptionAlertsEnabled===true,
      waId:t.conversation?.waId||null
    });
  }
  return rows;
}
