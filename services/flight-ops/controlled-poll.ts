import {db} from '@/lib/db';
import {queryFlightAwareStatus} from './flightaware';
import {upsertFlightIncident} from '@/services/operations/incidents';

function sameAirport(a:any,b:any){return String(a||'').trim().toUpperCase()===String(b||'').trim().toUpperCase();}

export async function controlledPollTicket(reference:string){
  const ref=String(reference||'').trim().toUpperCase();
  if(!ref)throw new Error('reference_required');
  const ticket:any=await (db as any).ticket.findUnique({where:{reference:ref}}).catch(()=>null);
  if(!ticket||ticket.status!=='ISSUED')throw new Error('issued_ticket_not_found');
  const tracks:any[]=await (db as any).flightTracking.findMany({where:{ticketReference:ref,active:true},orderBy:{scheduledDeparture:'asc'}}).catch(()=>[]);
  if(!tracks.length)throw new Error('tracking_not_ready');
  const results:any[]=[];
  for(const t of tracks){
    const date=new Date(t.scheduledDeparture).toISOString().slice(0,10);
    const provider:any=await queryFlightAwareStatus(t.airlineCode,t.flightNumber,date);
    if(!provider.ok||!provider.normalized){results.push({trackingId:t.id,flight:`${t.airlineCode}${t.flightNumber}`,ok:false,error:provider.error||'provider_failed',status:provider.status||null});continue;}
    const n=provider.normalized;
    if((n.origin&&!sameAirport(n.origin,t.origin))||(n.destination&&!sameAirport(n.destination,t.destination))){results.push({trackingId:t.id,flight:`${t.airlineCode}${t.flightNumber}`,ok:false,error:'route_mismatch',providerRoute:`${n.origin||'?'}-${n.destination||'?'}`,expectedRoute:`${t.origin}-${t.destination}`});continue;}
    const now=new Date();
    const data:any={
      lastCheckAt:now,
      providerUsed:'flightaware',
      flightStatus:n.status,
      estimatedDeparture:n.estimatedDeparture?new Date(n.estimatedDeparture):null,
      estimatedArrival:n.estimatedArrival?new Date(n.estimatedArrival):null,
      actualDeparture:n.actualDeparture?new Date(n.actualDeparture):null,
      actualArrival:n.actualArrival?new Date(n.actualArrival):null,
      delayMinutes:Number.isFinite(Number(n.delayMinutes))?Number(n.delayMinutes):0,
      gate:n.gate||null,
      terminal:n.terminal||null,
      rawData:n.raw
    };
    if(['landed','cancelled'].includes(String(n.status)))data.active=false;
    await upsertFlightIncident(t,String(t.flightStatus||''),String(n.status||''),Number(n.delayMinutes||0));
    await (db as any).flightTracking.update({where:{id:t.id},data});
    results.push({trackingId:t.id,flight:`${t.airlineCode}${t.flightNumber}`,route:`${t.origin}-${t.destination}`,ok:true,status:n.status,delayMinutes:n.delayMinutes,gate:n.gate||null,terminal:n.terminal||null,estimatedDeparture:n.estimatedDeparture||null,estimatedArrival:n.estimatedArrival||null});
  }
  return {reference:ref,polled:results.length,succeeded:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
}
