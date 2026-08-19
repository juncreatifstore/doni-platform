import {db} from '@/lib/db';
import type {SafeUser} from '@/lib/auth/session';
import {dataScopeForUser} from '@/lib/auth/data-scope';
import {getWorkspaceTaskForUser} from '@/lib/workspace/tasks';

export type CaseKind='CLIENT'|'PAYMENT'|'TICKET'|'POST_BOOKING'|'FLIGHT'|'TASK';
const prisma:any=db;
function taskRows(rows:any[]){return rows.map(r=>r.value).filter((x:any)=>x&&typeof x==='object'&&x.id&&x.title)}
function timelineItem(at:any,type:string,title:string,detail?:string|null){return {at:new Date(at).toISOString(),type,title,detail:detail||null}}

export async function case360Accessible(kind:CaseKind,id:string,user:SafeUser){
 const scope=dataScopeForUser(user);if(scope.mode==='global')return true;if(scope.mode==='none')return false;const country=scope.country;
 if(kind==='CLIENT')return Boolean(await prisma.customerProfile.findFirst({where:{id,country},select:{id:true}}));
 if(kind==='PAYMENT')return Boolean(await prisma.payment.findFirst({where:{id,conversation:{country}},select:{id:true}}));
 if(kind==='TICKET')return Boolean(await prisma.ticket.findFirst({where:{id,conversation:{country}},select:{id:true}}));
 if(kind==='POST_BOOKING'){const row=await prisma.postBookingRequest.findUnique({where:{id},select:{conversationId:true,ticketId:true}});if(!row)return false;if(row.conversationId&&await prisma.doniConversation.count({where:{id:row.conversationId,country}}))return true;if(row.ticketId&&await prisma.ticket.count({where:{id:row.ticketId,conversation:{country}}}))return true;return false;}
 if(kind==='FLIGHT'){const row=await prisma.flightTracking.findUnique({where:{id},select:{ticketId:true,ticketReference:true}});if(!row)return false;if(row.ticketId&&await prisma.ticket.count({where:{id:row.ticketId,conversation:{country}}}))return true;if(row.ticketReference&&await prisma.ticket.count({where:{reference:row.ticketReference,conversation:{country}}}))return true;return false;}
 if(kind==='TASK')return Boolean(await getWorkspaceTaskForUser(id,user));
 return false;
}

export async function getCase360(kind:CaseKind,id:string,user:SafeUser){
 if(!await case360Accessible(kind,id,user))return null;
 let client:any=null,conversation:any=null,payment:any=null,ticket:any=null,post:any=null,flight:any=null,task:any=null;
 if(kind==='CLIENT')client=await prisma.customerProfile.findUnique({where:{id}});
 if(kind==='PAYMENT')payment=await prisma.payment.findUnique({where:{id},include:{conversation:{include:{customer:true}}}});
 if(kind==='TICKET')ticket=await prisma.ticket.findUnique({where:{id},include:{conversation:{include:{customer:true}}}});
 if(kind==='POST_BOOKING')post=await prisma.postBookingRequest.findUnique({where:{id}});
 if(kind==='FLIGHT')flight=await prisma.flightTracking.findUnique({where:{id}});
 if(kind==='TASK'){const row=await prisma.appSetting.findUnique({where:{key:`workspace.task.${id}`}});task=row?.value||null;}
 if(payment?.conversation){conversation=payment.conversation;client=conversation.customer||null;}
 if(ticket?.conversation){conversation=ticket.conversation;client=conversation.customer||null;}
 if(post?.conversationId&&!conversation)conversation=await prisma.doniConversation.findUnique({where:{id:post.conversationId},include:{customer:true}});
 if(conversation&&!client)client=conversation.customer||null;
 if(flight?.ticketId&&!ticket)ticket=await prisma.ticket.findUnique({where:{id:flight.ticketId},include:{conversation:{include:{customer:true}}}}).catch(()=>null);
 if(!ticket&&flight?.ticketReference)ticket=await prisma.ticket.findUnique({where:{reference:flight.ticketReference},include:{conversation:{include:{customer:true}}}}).catch(()=>null);
 if(ticket&&!conversation){conversation=ticket.conversation||null;client=conversation?.customer||client;}
 if(task?.entityType==='Ticket'&&task.entityId&&!ticket)ticket=await prisma.ticket.findUnique({where:{id:task.entityId},include:{conversation:{include:{customer:true}}}}).catch(()=>null);
 if(task?.entityType==='FlightIncident'&&task.entityId&&!flight){const inc=await prisma.flightIncident.findUnique({where:{id:task.entityId},include:{tracking:true}}).catch(()=>null);flight=inc?.tracking||null;}
 if(task?.entityType==='PostBookingRequest'&&task.entityId&&!post)post=await prisma.postBookingRequest.findUnique({where:{id:task.entityId}}).catch(()=>null);
 if(ticket&&!conversation){conversation=ticket.conversation||null;client=conversation?.customer||client;}
 if(conversation?.id&&!payment)payment=await prisma.payment.findFirst({where:{conversationId:conversation.id},orderBy:{createdAt:'desc'}}).catch(()=>null);
 if(conversation?.id&&!ticket)ticket=await prisma.ticket.findFirst({where:{conversationId:conversation.id},orderBy:{createdAt:'desc'}}).catch(()=>null);
 if(ticket&&!flight)flight=await prisma.flightTracking.findFirst({where:{OR:[{ticketId:ticket.id},{ticketReference:ticket.reference}]},orderBy:{scheduledDeparture:'desc'}}).catch(()=>null);
 if(ticket&&!post)post=await prisma.postBookingRequest.findFirst({where:{OR:[{ticketId:ticket.id},{reference:ticket.reference}]},orderBy:{createdAt:'desc'}}).catch(()=>null);
 const conversationId=conversation?.id||ticket?.conversationId||payment?.conversationId||post?.conversationId||null;
 const ticketId=ticket?.id||post?.ticketId||flight?.ticketId||null;
 const ticketReference=ticket?.reference||flight?.ticketReference||post?.reference||null;
 const [messages,payments,tickets,postRequests,refunds,flights,incidents,settings,ticketEvents,audits]=await Promise.all([
  conversationId?prisma.conversationMessage.findMany({where:{conversationId},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]):Promise.resolve([]),
  conversationId?prisma.payment.findMany({where:{conversationId},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]):Promise.resolve(payment?[payment]:[]),
  conversationId?prisma.ticket.findMany({where:{conversationId},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]):Promise.resolve(ticket?[ticket]:[]),
  prisma.postBookingRequest.findMany({where:{OR:[...(conversationId?[{conversationId}]:[]),...(ticketId?[{ticketId}]:[]),...(ticketReference?[{reference:ticketReference}]:[])]},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]),
  prisma.refundRequest.findMany({where:{OR:[...(ticketReference?[{ticketReference}]:[]),...(post?.id?[{postBookingId:post.id}]:[])]},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]),
  prisma.flightTracking.findMany({where:{OR:[...(ticketId?[{ticketId}]:[]),...(ticketReference?[{ticketReference}]:[]),...(ticket?.pnr?[{pnr:ticket.pnr}]:[])]},orderBy:{scheduledDeparture:'desc'},take:20}).catch(()=>[]),
  prisma.flightIncident.findMany({where:{tracking:{OR:[...(ticketId?[{ticketId}]:[]),...(ticketReference?[{ticketReference}]:[])]}},orderBy:{createdAt:'desc'},take:20}).catch(()=>[]),
  prisma.appSetting.findMany({where:{category:'Workspace Tasks',key:{startsWith:'workspace.task.'}},take:300,orderBy:{updatedAt:'desc'},select:{value:true}}).catch(()=>[]),
  ticketId?prisma.ticketEvent.findMany({where:{ticketId},orderBy:{createdAt:'desc'},take:30}).catch(()=>[]):Promise.resolve([]),
  prisma.auditLog.findMany({where:{OR:[...(ticketId?[{entityId:ticketId}]:[]),...(conversationId?[{entityId:conversationId}]:[]),...(client?.id?[{entityId:client.id}]:[])]},orderBy:{createdAt:'desc'},take:30}).catch(()=>[]),
 ]);
 const refs=new Set([id,client?.id,conversationId,ticketId,ticketReference,payment?.id,payment?.reference,post?.id,flight?.id].filter(Boolean).map(String));
 const visibleTaskIds=new Set((await Promise.all(taskRows(settings).map(async(t:any)=>await getWorkspaceTaskForUser(String(t.id),user)?String(t.id):null))).filter(Boolean));
 const tasks=taskRows(settings).filter((t:any)=>visibleTaskIds.has(String(t.id))).filter((t:any)=>t.id===id||refs.has(String(t.entityId||''))||[ticketReference,ticket?.pnr,payment?.reference].filter(Boolean).some((v:any)=>String(t.title||'').includes(String(v))||String(t.description||'').includes(String(v))));
 const timeline:any[]=[];
 for(const m of messages)timeline.push(timelineItem(m.createdAt,'MESSAGE',m.direction==='inbound'?'Message client':'Réponse DONI',m.text));
 for(const p of payments)timeline.push(timelineItem(p.createdAt,'PAYMENT',`Paiement ${p.reference}`,`${p.status} · ${Number(p.amount).toFixed(2)} ${p.currency}`));
 for(const t of tickets)timeline.push(timelineItem(t.createdAt,'TICKET',`Billet ${t.reference}`,`${t.status}${t.pnr?` · PNR ${t.pnr}`:''}`));
 for(const p of postRequests)timeline.push(timelineItem(p.createdAt,'POST_BOOKING',`Après-vente ${p.reference}`,`${p.requestType} · ${p.status}`));
 for(const r of refunds)timeline.push(timelineItem(r.createdAt,'REFUND','Remboursement',`${r.status} · ${Number(r.amount).toFixed(2)} ${r.currency}`));
 for(const i of incidents)timeline.push(timelineItem(i.createdAt,'INCIDENT',i.title,`${i.severity} · ${i.status}`));
 for(const e of ticketEvents)timeline.push(timelineItem(e.createdAt,'TICKET_EVENT',e.eventType,e.status));
 for(const a of audits)timeline.push(timelineItem(a.createdAt,'AUDIT',a.action,a.entity||null));
 timeline.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
 const anchor=ticket||payment||post||flight||client||task;
 if(!anchor)return null;
 return {kind,id,client,conversation,payment,ticket,post,flight,messages,payments,tickets,postRequests,refunds,flights,incidents,tasks,timeline:timeline.slice(0,60)};
}
