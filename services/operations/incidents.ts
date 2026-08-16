import {db} from '@/lib/db';
import {audit} from '@/lib/audit';
import type {SafeUser} from '@/lib/auth/session';
import {getSetting} from '@/lib/settings/service';

export type FlightDisruptionType='delay'|'cancelled'|'diverted';

export function classifyFlightDisruption(newStatus:string,delayMinutes:number|null|undefined):FlightDisruptionType|null{
  const status=String(newStatus||'').toLowerCase();
  if(status==='cancelled'||status==='diverted')return status;
  if(status==='delayed'||Number(delayMinutes||0)>=30)return 'delay';
  return null;
}

export function disruptionMessage(t:any,type:FlightDisruptionType,delay:number){
  const id=`${t.airlineCode}${t.flightNumber}`,route=`${t.origin} → ${t.destination}`,lang=String(t.clientLanguage||'fr').toLowerCase();
  const m:any={
    fr:{delay:`⚠️ Mise à jour vol ${id}: retard estimé de ${delay} min sur ${route}. Vérifiez les écrans de l'aéroport et les messages de la compagnie.`,cancelled:`🚨 Vol ${id} annulé (${route}). DONI a détecté cette annulation. Un agent peut vous aider à vérifier les options disponibles.`,diverted:`🚨 Vol ${id} dérouté (${route}). Vérifiez les informations de la compagnie et de l'aéroport.`},
    en:{delay:`⚠️ Flight ${id} update: estimated delay ${delay} min on ${route}. Check airport screens and airline messages.`,cancelled:`🚨 Flight ${id} cancelled (${route}). DONI detected this cancellation. An agent can help review available options.`,diverted:`🚨 Flight ${id} diverted (${route}). Check airline and airport information.`},
    es:{delay:`⚠️ Actualización del vuelo ${id}: retraso estimado de ${delay} min en ${route}. Verifica las pantallas del aeropuerto y los mensajes de la aerolínea.`,cancelled:`🚨 Vuelo ${id} cancelado (${route}). DONI detectó la cancelación. Un agente puede ayudarte a revisar las opciones disponibles.`,diverted:`🚨 Vuelo ${id} desviado (${route}). Verifica la información de la aerolínea y del aeropuerto.`},
    ht:{delay:`⚠️ Mizajou vòl ${id}: gen anviwon ${delay} min reta sou ${route}. Verifye ekran ayewopò a ak mesaj konpayi an.`,cancelled:`🚨 Vòl ${id} anile (${route}). DONI detekte anilasyon an. Yon ajan ka ede w verifye opsyon ki disponib yo.`,diverted:`🚨 Vòl ${id} detounen (${route}). Verifye enfòmasyon konpayi an ak ayewopò a.`}
  };
  return (m[lang]||m.fr)[type]||m.fr.delay;
}

export async function upsertFlightIncident(tracking:any,previousStatus:string|null,newStatus:string,delayMinutes:number|null){
 const type=classifyFlightDisruption(newStatus,delayMinutes);if(!type)return null;
 const key=type==='delay'?`delay-${Math.floor(Math.max(30,Number(delayMinutes||0))/30)*30}`:type;
 const severity=type==='cancelled'||type==='diverted'?'critical':Number(delayMinutes||0)>=120?'critical':'warning';
 const title=type==='cancelled'?`Vol ${tracking.airlineCode}${tracking.flightNumber} annulé`:type==='diverted'?`Vol ${tracking.airlineCode}${tracking.flightNumber} dérouté`:`Retard ${tracking.airlineCode}${tracking.flightNumber}`;
 const message=type==='delay'?`${tracking.origin} → ${tracking.destination} · retard estimé ${delayMinutes||0} min`:`${tracking.origin} → ${tracking.destination} · statut ${newStatus}`;
 const row=await (db as any).flightIncident.upsert({where:{trackingId_incidentKey:{trackingId:tracking.id,incidentKey:key}},create:{trackingId:tracking.id,incidentKey:key,incidentType:type,severity,status:'open',title,message,metadata:{previousStatus,newStatus,delayMinutes}},update:{severity,status:'open',title,message,metadata:{previousStatus,newStatus,delayMinutes},resolvedAt:null}}).catch(()=>null);
 if(row&&await getSetting<boolean>('tracking.disruption_alerts_enabled')){const recipient=tracking.clientPhone||null;if(recipient)await (db as any).flightAlert.upsert({where:{trackingId_alertType:{trackingId:tracking.id,alertType:`disruption:${key}`}},create:{trackingId:tracking.id,alertType:`disruption:${key}`,status:'pending',scheduledAt:new Date(),language:tracking.clientLanguage||'fr',recipient,message:disruptionMessage(tracking,type,Number(delayMinutes||0))},update:{status:'pending',scheduledAt:new Date(),recipient,message:disruptionMessage(tracking,type,Number(delayMinutes||0)),error:null}}).catch(()=>null);}
 return row;
}

export async function listIncidents(){return (db as any).flightIncident.findMany({where:{status:{in:['open','acknowledged']}},include:{tracking:true},orderBy:[{createdAt:'desc'}],take:100});}
export async function updateIncident(id:string,status:string,user:SafeUser){if(!['acknowledged','resolved','open'].includes(status))throw new Error('invalid_status');const current=await (db as any).flightIncident.findUnique({where:{id}});if(!current)throw new Error('incident_not_found');const data:any={status};if(status==='acknowledged'){data.acknowledgedBy=user.id;data.acknowledgedAt=new Date();}if(status==='resolved')data.resolvedAt=new Date();if(status==='open'){data.resolvedAt=null;data.acknowledgedBy=null;data.acknowledgedAt=null;}const row=await (db as any).flightIncident.update({where:{id},data});await audit({userId:user.id,action:'flight_incident.update',entity:'FlightIncident',entityId:id,metadata:{from:current.status,to:status}});return row;}
