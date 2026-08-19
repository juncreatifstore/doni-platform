import {db} from '@/lib/db';
import type {SafeUser} from '@/lib/auth/session';
import {dataScopeForUser} from '@/lib/auth/data-scope';

export type GlobalSearchResult={id:string;type:'CLIENT'|'PAYMENT'|'TICKET'|'POST_BOOKING'|'FLIGHT'|'TASK';title:string;subtitle:string;meta?:string|null;href:string};
const prisma:any=db;
function clean(q:string){return q.trim().slice(0,80)}
function includes(v:unknown,q:string){return String(v??'').toLowerCase().includes(q.toLowerCase())}
function dossier(type:GlobalSearchResult['type'],id:string){return `/dossier/${type}/${encodeURIComponent(id)}`}

export async function globalWorkspaceSearch(raw:string,user:SafeUser):Promise<GlobalSearchResult[]>{
 const q=clean(raw);if(q.length<2)return [];
 const scope=dataScopeForUser(user);if(scope.mode==='none')return [];
 let conversationIds:string[]|null=null,ticketIds:string[]|null=null,ticketReferences:string[]|null=null,countryUserIds:string[]|null=null;
 if(scope.mode==='country'){
  const [conversations,tickets,countryUsers]=await Promise.all([
   prisma.doniConversation.findMany({where:{country:scope.country},select:{id:true}}),
   prisma.ticket.findMany({where:{conversation:{country:scope.country}},select:{id:true,reference:true}}),
   prisma.portalUser.findMany({where:{active:true,country:scope.country},select:{id:true}}),
  ]);
  conversationIds=conversations.map((x:any)=>x.id);ticketIds=tickets.map((x:any)=>x.id);ticketReferences=tickets.map((x:any)=>x.reference).filter(Boolean);countryUserIds=countryUsers.map((x:any)=>x.id);
 }
 const clientScope=scope.mode==='country'?{country:scope.country}:{};
 const paymentScope=scope.mode==='country'?{conversation:{country:scope.country}}:{};
 const ticketScope=scope.mode==='country'?{conversation:{country:scope.country}}:{};
 const postScope=scope.mode==='country'?{OR:[{conversationId:{in:conversationIds||[]}},{ticketId:{in:ticketIds||[]}}]}:{};
 const flightScope=scope.mode==='country'?{OR:[{ticketId:{in:ticketIds||[]}},{ticketReference:{in:ticketReferences||[]}}]}:{};
 const [clients,payments,tickets,post,flights,settings]=await Promise.all([
  prisma.customerProfile.findMany({where:{AND:[clientScope,{OR:[{customerCode:{contains:q,mode:'insensitive'}},{phone:{contains:q}},{displayName:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]}]},take:6,orderBy:{lastSeenAt:'desc'},select:{id:true,customerCode:true,phone:true,displayName:true,email:true,country:true}}).catch(()=>[]),
  prisma.payment.findMany({where:{AND:[paymentScope,{reference:{contains:q,mode:'insensitive'}}]},take:6,orderBy:{updatedAt:'desc'},select:{id:true,reference:true,status:true,provider:true,currency:true,amount:true}}).catch(()=>[]),
  prisma.ticket.findMany({where:{AND:[ticketScope,{OR:[{reference:{contains:q,mode:'insensitive'}},{pnr:{contains:q,mode:'insensitive'}},{ticketNumber:{contains:q,mode:'insensitive'}},{providerBookingId:{contains:q,mode:'insensitive'}}]}]},take:8,orderBy:{updatedAt:'desc'},select:{id:true,reference:true,pnr:true,ticketNumber:true,status:true,deliveryStatus:true}}).catch(()=>[]),
  prisma.postBookingRequest.findMany({where:{AND:[postScope,{OR:[{reference:{contains:q,mode:'insensitive'}},{phone:{contains:q}},{requestType:{contains:q,mode:'insensitive'}}]}]},take:6,orderBy:{updatedAt:'desc'},select:{id:true,reference:true,phone:true,requestType:true,status:true,priority:true}}).catch(()=>[]),
  prisma.flightTracking.findMany({where:{AND:[flightScope,{OR:[{ticketReference:{contains:q,mode:'insensitive'}},{pnr:{contains:q,mode:'insensitive'}},{ticketNumber:{contains:q,mode:'insensitive'}},{flightNumber:{contains:q,mode:'insensitive'}},{clientPhone:{contains:q}}]}]},take:6,orderBy:{updatedAt:'desc'},select:{id:true,ticketReference:true,pnr:true,airlineCode:true,flightNumber:true,origin:true,destination:true,flightStatus:true,scheduledDeparture:true}}).catch(()=>[]),
  prisma.appSetting.findMany({where:{category:'Workspace Tasks',key:{startsWith:'workspace.task.'}},take:250,orderBy:{updatedAt:'desc'},select:{value:true}}).catch(()=>[]),
 ]);
 const results:GlobalSearchResult[]=[];
 for(const c of clients)results.push({id:c.id,type:'CLIENT',title:c.displayName||c.customerCode,subtitle:`${c.customerCode} · ${c.phone}`,meta:[c.email,c.country].filter(Boolean).join(' · ')||null,href:dossier('CLIENT',c.id)});
 for(const p of payments)results.push({id:p.id,type:'PAYMENT',title:`Paiement ${p.reference}`,subtitle:`${p.provider} · ${Number(p.amount).toFixed(2)} ${p.currency}`,meta:p.status,href:dossier('PAYMENT',p.id)});
 for(const t of tickets)results.push({id:t.id,type:'TICKET',title:`Billet ${t.reference}`,subtitle:[t.pnr&&`PNR ${t.pnr}`,t.ticketNumber].filter(Boolean).join(' · ')||'Billet',meta:`${t.status} · ${t.deliveryStatus}`,href:dossier('TICKET',t.id)});
 for(const p of post)results.push({id:p.id,type:'POST_BOOKING',title:`Après-vente ${p.reference}`,subtitle:`${p.requestType}${p.phone?` · ${p.phone}`:''}`,meta:p.status,href:dossier('POST_BOOKING',p.id)});
 for(const f of flights)results.push({id:f.id,type:'FLIGHT',title:`${f.airlineCode}${f.flightNumber} · ${f.origin}→${f.destination}`,subtitle:[f.ticketReference,f.pnr&&`PNR ${f.pnr}`].filter(Boolean).join(' · ')||'Suivi de vol',meta:f.flightStatus,href:dossier('FLIGHT',f.id)});
 for(const row of settings){const t=row.value as any;if(!t||typeof t!=='object'||!t.id||!t.title)continue;if(scope.mode==='country'&&!countryUserIds?.includes(String(t.createdById||''))&&!countryUserIds?.includes(String(t.assigneeId||'')))continue;if((user.orgRole==='SECTION_MANAGER'||user.orgRole==='AGENT')&&user.department&&t.department!==user.department&&t.assigneeId!==user.id)continue;if(![t.title,t.description,t.entityId,t.assigneeName,t.department].some(v=>includes(v,q)))continue;results.push({id:String(t.id),type:'TASK',title:String(t.title),subtitle:`${t.department||'Tâche'} · ${t.assigneeName||'Non assignée'}`,meta:`${t.priority||'NORMAL'} · ${t.status||'OPEN'}`,href:dossier('TASK',String(t.id))});if(results.filter(x=>x.type==='TASK').length>=6)break;}
 return results.slice(0,30);
}
