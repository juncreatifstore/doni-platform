import {db} from '@/lib/db';
import {normalizeTicketPayload} from '@/services/ticketing/types';
import {getSetting} from '@/lib/settings/service';

export async function getReservationOverview(reference?:string){
  const where:any={status:'ISSUED'};
  if(reference) where.reference=reference.trim().toUpperCase();
  const tickets=await (db as any).ticket.findMany({where,include:{conversation:true},orderBy:{issuedAt:'desc'},take:reference?1:50});
  const [alertsEnabled,disruptionAlertsEnabled,deliveryEnabled]=await Promise.all([
    getSetting<boolean>('tracking.alerts_enabled'),
    getSetting<boolean>('tracking.disruption_alerts_enabled'),
    getSetting<boolean>('ticketing.delivery_enabled')
  ]);
  const rows=[] as any[];
  for(const t of tickets){
    const payload:any=normalizeTicketPayload(t.payload);
    const tracking=await (db as any).flightTracking.findMany({where:{ticketReference:t.reference},orderBy:{scheduledDeparture:'asc'}}).catch(()=>[]);
    const nextDeparture=(payload.segments||[]).map((s:any)=>new Date(s.departureAt||0)).filter((d:Date)=>!Number.isNaN(d.getTime())&&d.getTime()>Date.now()).sort((a:Date,b:Date)=>a.getTime()-b.getTime())[0]||null;
    const hoursToDeparture=nextDeparture?(nextDeparture.getTime()-Date.now())/3600000:null;
    const checkinEligible=hoursToDeparture!==null&&hoursToDeparture>0&&hoursToDeparture<=48;
    const trackingRows=tracking.map((x:any)=>({
      id:x.id,airlineCode:x.airlineCode,flightNumber:x.flightNumber,origin:x.origin,destination:x.destination,
      scheduledDeparture:x.scheduledDeparture,scheduledArrival:x.scheduledArrival,
      estimatedDeparture:x.estimatedDeparture,estimatedArrival:x.estimatedArrival,
      actualDeparture:x.actualDeparture,actualArrival:x.actualArrival,
      flightStatus:x.flightStatus,delayMinutes:x.delayMinutes,gate:x.gate,terminal:x.terminal,
      active:x.active,lastCheckAt:x.lastCheckAt,nextCheckAt:x.nextCheckAt
    }));
    const hasDisruption=trackingRows.some((x:any)=>['delayed','cancelled','diverted'].includes(String(x.flightStatus||'').toLowerCase())||Number(x.delayMinutes||0)>=15);
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
      tracking:trackingRows,
      trackingCount:tracking.length,
      trackingReady:tracking.length>0,
      hasDisruption,
      canResendEticket:t.status==='ISSUED',
      resendEnabled:t.status==='ISSUED'&&deliveryEnabled===true,
      checkinEligible,
      checkinWindow:checkinEligible?'OPEN':hoursToDeparture!==null&&hoursToDeparture>48?'NOT_OPEN_YET':'CLOSED',
      hoursToDeparture:hoursToDeparture===null?null:Math.round(hoursToDeparture*10)/10,
      alertsEnabled:alertsEnabled===true,
      disruptionAlertsEnabled:disruptionAlertsEnabled===true,
      waId:t.conversation?.waId||null
    });
  }
  return rows;
}
