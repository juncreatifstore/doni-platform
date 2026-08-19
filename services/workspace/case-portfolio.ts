import {db} from '@/lib/db';
import {listCaseWorkspaces,caseWorkspaceAssignees,type CaseWorkspaceState} from '@/lib/workspace/case-workspace';
import type {SafeUser} from '@/lib/auth/session';
import {case360Accessible} from '@/services/workspace/case-360';
const prisma:any=db;
export type CasePortfolioRow=CaseWorkspaceState&{title:string;subtitle:string;href:string;kindLabel:string;isOverdue:boolean;isDueToday:boolean};
function kindLabel(kind:string){return ({CLIENT:'Client',PAYMENT:'Paiement',TICKET:'Billet',POST_BOOKING:'Après-vente',FLIGHT:'Flight Ops',TASK:'Tâche'} as Record<string,string>)[kind]||kind;}
function todayBounds(){const s=new Date();s.setHours(0,0,0,0);const e=new Date(s);e.setDate(e.getDate()+1);return {s,e};}
export async function getCasePortfolio(user:SafeUser){
 const allStates=await listCaseWorkspaces();
 const visibility=await Promise.all(allStates.map(async state=>await case360Accessible(state.kind as any,state.caseId,user).catch(()=>false)));
 const states=allStates.filter((_,i)=>visibility[i]);
 const ids=(kind:string)=>states.filter(x=>x.kind===kind).map(x=>x.caseId);const [clients,payments,tickets,posts,flights,taskRows,users]=await Promise.all([
 prisma.customerProfile.findMany({where:{id:{in:ids('CLIENT')}},select:{id:true,displayName:true,customerCode:true,phone:true}}).catch(()=>[]),
 prisma.payment.findMany({where:{id:{in:ids('PAYMENT')}},select:{id:true,reference:true,status:true,amount:true,currency:true}}).catch(()=>[]),
 prisma.ticket.findMany({where:{id:{in:ids('TICKET')}},select:{id:true,reference:true,pnr:true,ticketNumber:true,status:true}}).catch(()=>[]),
 prisma.postBookingRequest.findMany({where:{id:{in:ids('POST_BOOKING')}},select:{id:true,reference:true,requestType:true,status:true}}).catch(()=>[]),
 prisma.flightTracking.findMany({where:{id:{in:ids('FLIGHT')}},select:{id:true,ticketReference:true,pnr:true,airlineCode:true,flightNumber:true,origin:true,destination:true,flightStatus:true}}).catch(()=>[]),
 prisma.appSetting.findMany({where:{category:'Workspace Tasks',key:{startsWith:'workspace.task.'}},select:{value:true}}).catch(()=>[]),
 caseWorkspaceAssignees(user),
 ]);
 const maps={
  CLIENT:new Map(clients.map((x:any)=>[x.id,x])),PAYMENT:new Map(payments.map((x:any)=>[x.id,x])),TICKET:new Map(tickets.map((x:any)=>[x.id,x])),POST_BOOKING:new Map(posts.map((x:any)=>[x.id,x])),FLIGHT:new Map(flights.map((x:any)=>[x.id,x])),TASK:new Map(taskRows.map((x:any)=>{const v=x.value as any;return [v?.id,v]}).filter((x:any)=>x[0]))
 } as Record<string,Map<string,any>>;
 const {s,e}=todayBounds();const now=new Date();
 const rows:CasePortfolioRow[]=states.map(state=>{const x=maps[state.kind]?.get(state.caseId);let title=`${kindLabel(state.kind)} ${state.caseId.slice(0,8)}`,subtitle='Dossier 360';
  if(state.kind==='CLIENT'&&x){title=x.displayName||x.customerCode;subtitle=`${x.customerCode} · ${x.phone}`;}
  if(state.kind==='PAYMENT'&&x){title=`Paiement ${x.reference}`;subtitle=`${Number(x.amount).toFixed(2)} ${x.currency} · ${x.status}`;}
  if(state.kind==='TICKET'&&x){title=`Billet ${x.reference}`;subtitle=[x.pnr&&`PNR ${x.pnr}`,x.ticketNumber,x.status].filter(Boolean).join(' · ');}
  if(state.kind==='POST_BOOKING'&&x){title=`Après-vente ${x.reference}`;subtitle=`${x.requestType} · ${x.status}`;}
  if(state.kind==='FLIGHT'&&x){title=`${x.airlineCode}${x.flightNumber} · ${x.origin}→${x.destination}`;subtitle=[x.ticketReference,x.pnr&&`PNR ${x.pnr}`,x.flightStatus].filter(Boolean).join(' · ');}
  if(state.kind==='TASK'&&x){title=x.title||title;subtitle=`${x.department||'Tâche'} · ${x.status||'OPEN'}`;}
  const due=state.nextActionDueAt?new Date(state.nextActionDueAt):null;return {...state,title,subtitle,href:`/dossier/${encodeURIComponent(state.kind)}/${encodeURIComponent(state.caseId)}`,kindLabel:kindLabel(state.kind),isOverdue:Boolean(due&&due<now),isDueToday:Boolean(due&&due>=s&&due<e)};
 });
 const rank={URGENT:0,HIGH:1,NORMAL:2,LOW:3} as Record<string,number>;rows.sort((a,b)=>{if(a.isOverdue!==b.isOverdue)return a.isOverdue?-1:1;if(a.isDueToday!==b.isDueToday)return a.isDueToday?-1:1;const p=(rank[a.priority]??2)-(rank[b.priority]??2);if(p)return p;const ad=a.nextActionDueAt?new Date(a.nextActionDueAt).getTime():Number.MAX_SAFE_INTEGER,bd=b.nextActionDueAt?new Date(b.nextActionDueAt).getTime():Number.MAX_SAFE_INTEGER;return ad-bd;});
 return {rows,users};
}
