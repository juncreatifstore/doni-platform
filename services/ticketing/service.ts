import { registerTicketForTracking } from '@/services/flight-ops/register';
import { db as prisma } from '@/lib/db';
import { normalizeTicketPayload, type TicketPayload } from './types';

function payloadOf(v: unknown): TicketPayload { return normalizeTicketPayload(v); }
export function validateIssuable(payload: TicketPayload){
  const passengers = Array.isArray(payload.passengers) ? payload.passengers : [];
  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  if (!passengers.length) throw new Error('ticket_missing_passengers');
  if (!segments.length) throw new Error('ticket_missing_segments');
  return { passengers, segments };
}
export async function getTicketQueue(){
  const rows = await prisma.ticket.findMany({
    where:{ status:{ in:['PENDING_MANUAL_ISSUE','ISSUING'] } },
    include:{ conversation:true }, orderBy:{ createdAt:'asc' }, take:100
  });
  return rows.map((t:any)=>{ const payload=payloadOf(t.payload); return {
    id:t.id, reference:t.reference, status:t.status, pnr:t.pnr, ticketNumber:t.ticketNumber,
    createdAt:t.createdAt, passengerCount:Array.isArray(payload.passengers)?payload.passengers.length:0,
    segmentCount:Array.isArray(payload.segments)?payload.segments.length:0, passengers:payload.passengers||[], segments:payload.segments||[],
    contact:payload.contact||{}, total:payload.total, currency:payload.currency, waId:t.conversation?.waId||null
  }});
}
export async function getRecentlyIssued(){
  const rows=await prisma.ticket.findMany({where:{status:'ISSUED'},include:{conversation:true},orderBy:{issuedAt:'desc'},take:10});
  return rows.map((t:any)=>{const payload=payloadOf(t.payload);return {id:t.id,reference:t.reference,pnr:t.pnr,ticketNumber:t.ticketNumber,issuedAt:t.issuedAt,deliveryStatus:t.deliveryStatus,passengerCount:payload.passengers?.length||0,segmentCount:payload.segments?.length||0,segments:payload.segments||[],contact:payload.contact||{},total:payload.total,currency:payload.currency,waId:t.conversation?.waId||null}})
}
export async function issueManual(input:{reference:string;pnr:string;ticketNumber?:string;agent?:string}){
  const ticket=await prisma.ticket.findUnique({where:{reference:input.reference}}); if(!ticket) throw new Error('ticket_not_found');
  if(ticket.status==='ISSUED') return ticket;
  if(!['PENDING_MANUAL_ISSUE','ISSUING'].includes(ticket.status)) throw new Error('ticket_invalid_status');
  validateIssuable(payloadOf(ticket.payload));
  const pnr=input.pnr.trim().toUpperCase(); if(!/^[A-Z0-9]{4,12}$/.test(pnr)) throw new Error('invalid_pnr');
  const updated=await prisma.$transaction(async (tx:any)=>{
    await tx.ticket.update({where:{id:ticket.id},data:{status:'ISSUING'}});
    await tx.ticketEvent.create({data:{ticketId:ticket.id,eventType:'manual_issue_started',status:'ISSUING',actor:input.agent||'portal'}});
    const done=await tx.ticket.update({where:{id:ticket.id},data:{status:'ISSUED',pnr,ticketNumber:input.ticketNumber?.trim()||null,issuedBy:input.agent||'portal',issuedAt:new Date()}});
    await tx.ticketEvent.create({data:{ticketId:ticket.id,eventType:'manual_issue_completed',status:'ISSUED',actor:input.agent||'portal',details:{pnr,ticketNumber:input.ticketNumber||null}}});
    return done;
  });
  await registerTicketForTracking(input.reference).catch(()=>null);
  return updated;
}

export async function setSegmentPnrs(input:{reference:string;pnrs:string[];agent?:string}){
  const ticket=await prisma.ticket.findUnique({where:{reference:input.reference}}); if(!ticket) throw new Error('ticket_not_found');
  if(ticket.status!=='ISSUED') throw new Error('ticket_not_issued');
  const payload=payloadOf(ticket.payload); const segments=payload.segments||[];
  if(!segments.length) throw new Error('ticket_missing_segments');
  if(input.pnrs.length!==segments.length) throw new Error('segment_pnr_count_mismatch');
  const pnrs=input.pnrs.map(x=>String(x||'').trim().toUpperCase());
  for(const pnr of pnrs) if(!/^[A-Z0-9]{4,12}$/.test(pnr)) throw new Error('invalid_segment_pnr');
  const next={...payload,segments:segments.map((s:any,i:number)=>({...s,pnr:pnrs[i],bookingReference:pnrs[i]}))};
  const updated=await prisma.ticket.update({where:{id:ticket.id},data:{payload:next as any}});
  await prisma.ticketEvent.create({data:{ticketId:ticket.id,eventType:'segment_pnrs_updated',status:'ISSUED',actor:input.agent||'portal',details:{pnrs}}});
  return updated;
}
