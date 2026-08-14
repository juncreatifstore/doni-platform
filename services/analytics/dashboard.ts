import { db } from '@/lib/db';

type CurrencyTotal = { currency:string; amount:number; count:number };
type ProviderTotal = { provider:string; amount:number; count:number };
type SegmentTotal = { segment:string; count:number };

const HOUR = 60*60*1000;
const DAY = 24*HOUR;

function since(ms:number){ return new Date(Date.now()-ms); }
function num(v: unknown){ return Number(v ?? 0); }
function pct(a:number,b:number){ return b>0 ? Math.round((a/b)*1000)/10 : 0; }

export async function getOverviewMetrics(){
  const last24h=since(DAY);
  const staleAt=since(15*60*1000);
  const [active,agentRequired,stalled,pendingPayments,paid24h,ticketsToIssue,issued24h,deliveryFailures,paidRows,recentConversations]=await Promise.all([
    db.doniConversation.count({where:{status:'ACTIVE'}}),
    db.doniConversation.count({where:{status:'ACTIVE',agentRequired:true}}),
    db.doniConversation.count({where:{status:'ACTIVE',updatedAt:{lt:staleAt}}}),
    db.payment.count({where:{status:'PENDING'}}),
    db.payment.count({where:{status:'PAID',updatedAt:{gte:last24h}}}),
    db.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']}}}),
    db.ticket.count({where:{status:'ISSUED',issuedAt:{gte:last24h}}}),
    db.ticket.count({where:{deliveryStatus:'FAILED'}}),
    db.payment.findMany({where:{status:'PAID',updatedAt:{gte:last24h}},select:{currency:true,amount:true}}),
    db.doniConversation.findMany({orderBy:{updatedAt:'desc'},take:8,select:{id:true,waId:true,country:true,language:true,currentSegment:true,agentRequired:true,status:true,updatedAt:true}})
  ]);
  const revenueByCurrency=new Map<string,number>();
  for(const row of paidRows) revenueByCurrency.set(row.currency,(revenueByCurrency.get(row.currency)||0)+num(row.amount));
  return {active,agentRequired,stalled,pendingPayments,paid24h,ticketsToIssue,issued24h,deliveryFailures,revenue24h:[...revenueByCurrency].map(([currency,amount])=>({currency,amount})),recentConversations};
}

export async function getFinanceMetrics(){
  const last24h=since(DAY), last7d=since(7*DAY), previous7d=since(14*DAY);
  const [paid7d,paidPrev7d,statusGroups,providerRows,recentPayments]=await Promise.all([
    db.payment.findMany({where:{status:'PAID',updatedAt:{gte:last7d}},select:{currency:true,amount:true,provider:true,updatedAt:true}}),
    db.payment.findMany({where:{status:'PAID',updatedAt:{gte:previous7d,lt:last7d}},select:{currency:true,amount:true}}),
    db.payment.groupBy({by:['status'],_count:{_all:true}}),
    db.payment.findMany({where:{status:'PAID',updatedAt:{gte:last7d}},select:{provider:true,currency:true,amount:true}}),
    db.payment.findMany({orderBy:{updatedAt:'desc'},take:15,select:{reference:true,provider:true,currency:true,amount:true,status:true,updatedAt:true,conversationId:true}})
  ]);
  const byCurrency=new Map<string,{amount:number;count:number}>();
  const byCurrency24h=new Map<string,{amount:number;count:number}>();
  const prevByCurrency=new Map<string,number>();
  const byProviderCurrency=new Map<string,{provider:string;currency:string;amount:number;count:number}>();
  for(const r of paid7d){
    const cur=byCurrency.get(r.currency)||{amount:0,count:0};cur.amount+=num(r.amount);cur.count++;byCurrency.set(r.currency,cur);
    if(r.updatedAt>=last24h){const d=byCurrency24h.get(r.currency)||{amount:0,count:0};d.amount+=num(r.amount);d.count++;byCurrency24h.set(r.currency,d)}
  }
  for(const r of paidPrev7d) prevByCurrency.set(r.currency,(prevByCurrency.get(r.currency)||0)+num(r.amount));
  for(const r of providerRows){const k=`${r.provider}::${r.currency}`;const d=byProviderCurrency.get(k)||{provider:r.provider,currency:r.currency,amount:0,count:0};d.amount+=num(r.amount);d.count++;byProviderCurrency.set(k,d)}
  const currencyTotals=[...byCurrency].map(([currency,v])=>({currency,...v,previousAmount:prevByCurrency.get(currency)||0,changePct:(prevByCurrency.get(currency)||0)>0?Math.round(((v.amount-(prevByCurrency.get(currency)||0))/(prevByCurrency.get(currency)||1))*1000)/10:null})) as Array<CurrencyTotal & {previousAmount:number;changePct:number|null}>;
  const dayTotals=[...byCurrency24h].map(([currency,v])=>({currency,...v})) as CurrencyTotal[];
  const providerTotals=[...byProviderCurrency.values()].sort((a,b)=>b.amount-a.amount) as Array<ProviderTotal & {currency:string}>;
  return {currencyTotals,dayTotals,providerTotals,statusGroups:statusGroups.map(s=>({status:s.status,count:s._count._all})),recentPayments};
}

const FUNNEL=[
 ['language','Langue',['segment_language']],
 ['service','Service',['segment_service_selection']],
 ['trip','Type voyage',['segment_trip_type']],
 ['route','Trajet',['segment_origin','segment_airport_choice_origin','segment_destination','segment_airport_choice_destination']],
 ['dates','Dates',['segment_departure_date','segment_return_date']],
 ['passengers','Passagers',['segment_passengers','segment_new_passenger','segment_saved_passengers','segment_manual_passenger','segment_ocr_upload','segment_ocr_confirmation']],
 ['search','Recherche',['segment_search']],
 ['results','Résultats',['segment_results','segment_selection','segment_repricing']],
 ['contact','Coordonnées',['segment_contact_email','segment_contact_phone','segment_recap']],
 ['payment','Paiement',['segment_payment_choice','segment_payment_confirmation']],
] as const;

export async function getFlowMetrics(){
  const stale10=since(10*60*1000), stale30=since(30*60*1000), last24=since(DAY);
  const [segmentGroups,activeRows,started24,paid24,issued24]=await Promise.all([
    db.doniConversation.groupBy({by:['currentSegment'],where:{status:'ACTIVE'},_count:{_all:true}}),
    db.doniConversation.findMany({where:{status:'ACTIVE'},select:{id:true,waId:true,country:true,language:true,currentSegment:true,agentRequired:true,updatedAt:true},orderBy:{updatedAt:'asc'},take:250}),
    db.doniConversation.count({where:{createdAt:{gte:last24}}}),
    db.payment.count({where:{status:'PAID',updatedAt:{gte:last24}}}),
    db.ticket.count({where:{status:'ISSUED',issuedAt:{gte:last24}}}),
  ]);
  const segmentMap=new Map(segmentGroups.map(x=>[x.currentSegment,x._count._all]));
  const funnel=FUNNEL.map(([key,label,segments])=>({key,label,count:segments.reduce((n,s)=>n+(segmentMap.get(s)||0),0)}));
  const unknown=segmentGroups.filter(x=>!FUNNEL.some(([, ,ss])=>(ss as readonly string[]).includes(x.currentSegment))).map(x=>({segment:x.currentSegment,count:x._count._all})).sort((a,b)=>b.count-a.count);
  const stalled=activeRows.filter(r=>r.updatedAt<stale10).map(r=>({...r,stalledMinutes:Math.max(0,Math.floor((Date.now()-r.updatedAt.getTime())/60000))}));
  const critical=stalled.filter(r=>r.updatedAt<stale30 || r.agentRequired);
  return {funnel,unknown,stalled:stalled.slice(0,30),criticalCount:critical.length,started24,paid24,issued24,paymentConversionPct:pct(paid24,started24),issueConversionPct:pct(issued24,started24),segmentGroups:segmentGroups.map(x=>({segment:x.currentSegment,count:x._count._all})).sort((a,b)=>b.count-a.count)};
}
