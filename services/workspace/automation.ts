import {db} from '@/lib/db';
import {reconcileAutomatedWorkspaceTasks,upsertAutomatedWorkspaceTask,type TaskPriority} from '@/lib/workspace/tasks';
import type {Department} from '@/lib/auth/departments';

const prisma:any=db;
const MIN=60_000;
const OPEN_POST=['request_created','waiting_admin_review','waiting_airline_confirmation','penalty_pending','waiting_customer_payment'];
function dueFrom(date:Date,minutes:number){return new Date(date.getTime()+minutes*MIN).toISOString();}
function ageMinutes(date:Date){return Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/MIN));}
function priority(age:number,highAt:number,urgentAt:number):TaskPriority{return age>=urgentAt?'URGENT':age>=highAt?'HIGH':'NORMAL';}

type Candidate={key:string;title:string;description:string;department:Department;priority:TaskPriority;dueAt:string;entityType:string;entityId:string;sourceStatus:string};

export async function runWorkspaceAutomation(){
 const now=new Date();
 const [reviews,tickets,incidents,postBooking,deliveryFailures]=await Promise.all([
  prisma.manualPaymentReview.findMany({where:{status:{in:['PENDING','NEEDS_INFO']}},orderBy:{createdAt:'asc'},take:100,select:{id:true,status:true,ocrStatus:true,createdAt:true,payment:{select:{reference:true,amount:true,currency:true,provider:true}}}}),
  prisma.ticket.findMany({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']}},orderBy:{updatedAt:'asc'},take:100,select:{id:true,reference:true,status:true,pnr:true,updatedAt:true}}),
  prisma.flightIncident.findMany({where:{status:{in:['open','acknowledged']}},orderBy:{createdAt:'asc'},take:100,select:{id:true,incidentType:true,severity:true,status:true,createdAt:true,tracking:{select:{ticketReference:true,airlineCode:true,flightNumber:true,origin:true,destination:true}}}}),
  prisma.postBookingRequest.findMany({where:{status:{in:OPEN_POST}},orderBy:{createdAt:'asc'},take:100,select:{id:true,reference:true,requestType:true,status:true,priority:true,phone:true,createdAt:true}}),
  prisma.ticket.findMany({where:{deliveryStatus:'FAILED'},orderBy:{updatedAt:'asc'},take:100,select:{id:true,reference:true,deliveryStatus:true,updatedAt:true}}),
 ]);
 const candidates:Candidate[]=[];
 for(const r of reviews){const age=ageMinutes(r.createdAt);if(age<15)continue;candidates.push({key:`manual-review:${r.id}`,title:`Vérifier reçu ${r.payment.reference}`,description:`${r.payment.provider} · ${Number(r.payment.amount).toFixed(2)} ${r.payment.currency} · OCR ${r.ocrStatus}`,department:'FINANCE',priority:priority(age,30,60),dueAt:dueFrom(r.createdAt,30),entityType:'ManualPaymentReview',entityId:r.id,sourceStatus:r.status});}
 for(const t of tickets){const age=ageMinutes(t.updatedAt);if(age<10)continue;candidates.push({key:`ticket-issue:${t.id}`,title:`Émettre billet ${t.reference}`,description:`${t.status}${t.pnr?` · PNR ${t.pnr}`:''}`,department:'TICKETING',priority:priority(age,20,45),dueAt:dueFrom(t.updatedAt,20),entityType:'Ticket',entityId:t.id,sourceStatus:t.status});}
 for(const i of incidents){const age=ageMinutes(i.createdAt);const flight=i.tracking?`${i.tracking.airlineCode}${i.tracking.flightNumber} ${i.tracking.origin}→${i.tracking.destination}`:'Vol';candidates.push({key:`flight-incident:${i.id}`,title:`Incident ${flight}`,description:`${i.incidentType||'incident'} · ${i.severity||'standard'} · billet ${i.tracking?.ticketReference||'non lié'}`,department:'FLIGHT_OPS',priority:i.severity==='critical'?'URGENT':age>=30?'URGENT':'HIGH',dueAt:dueFrom(i.createdAt,15),entityType:'FlightIncident',entityId:i.id,sourceStatus:i.status});}
 for(const p of postBooking){const age=ageMinutes(p.createdAt);if(age<30)continue;const urgent=p.priority==='critical'||age>=240;candidates.push({key:`post-booking:${p.id}`,title:`Après-vente ${p.reference}`,description:`${p.requestType} · ${p.status} · ${p.phone||'sans téléphone'}`,department:'CUSTOMER_SERVICE',priority:urgent?'URGENT':age>=120?'HIGH':'NORMAL',dueAt:dueFrom(p.createdAt,120),entityType:'PostBookingRequest',entityId:p.id,sourceStatus:p.status});}
 for(const d of deliveryFailures){const age=ageMinutes(d.updatedAt);candidates.push({key:`ticket-delivery:${d.id}`,title:`Relivrer e-ticket ${d.reference}`,description:'La dernière livraison du billet est en échec.',department:'TICKETING',priority:age>=30?'URGENT':'HIGH',dueAt:dueFrom(d.updatedAt,15),entityType:'Ticket',entityId:d.id,sourceStatus:d.deliveryStatus});}
 const activeKeys=new Set<string>();let createdOrUpdated=0;
 for(const c of candidates){activeKeys.add(c.key);await upsertAutomatedWorkspaceTask({automationKey:c.key,title:c.title,description:c.description,department:c.department,priority:c.priority,dueAt:c.dueAt,entityType:c.entityType,entityId:c.entityId,sourceStatus:c.sourceStatus});createdOrUpdated++;}
 const closed=await reconcileAutomatedWorkspaceTasks(activeKeys);
 return {ranAt:now.toISOString(),candidates:candidates.length,createdOrUpdated,closed,rules:{manualPaymentSlaMinutes:30,ticketIssueSlaMinutes:20,flightIncidentSlaMinutes:15,postBookingSlaMinutes:120,ticketDeliverySlaMinutes:15}};
}
