import {db} from '@/lib/db';
import {listMarketingFlightSearches,type MarketingSearchEvent} from '@/lib/workspace/marketing-search-intelligence';

const DAY=86400000;
export type RecoveryStage='SEARCH_ABANDONED'|'OFFER_SELECTED'|'CHECKOUT_STARTED'|'PAYMENT_ABANDONED';

function money(v:unknown){const n=Number(v);return Number.isFinite(n)?n:0;}
function stateOf(v:unknown){return v&&typeof v==='object'?(v as Record<string,any>):{};}
function latestSearchByConversation(searches:MarketingSearchEvent[]){const m=new Map<string,MarketingSearchEvent>();for(const s of searches){const prev=m.get(s.conversationId);if(!prev||new Date(s.searchedAt)>new Date(prev.searchedAt))m.set(s.conversationId,s);}return m;}

export async function getAbandonedBookingRecovery(days=30){
 const from=new Date(Date.now()-Math.max(1,Math.min(days,90))*DAY);
 const searches=await listMarketingFlightSearches(Math.max(days,90));
 const searchByConversation=latestSearchByConversation(searches);
 const conversations=await db.doniConversation.findMany({
  where:{updatedAt:{gte:from}},
  orderBy:{updatedAt:'desc'},
  include:{customer:{select:{id:true,displayName:true,phone:true,email:true,country:true}},payments:{orderBy:{createdAt:'desc'}},tickets:{select:{id:true,status:true}}}
 });
 const opportunities=conversations.flatMap(c=>{
  if(c.tickets.some(t=>['PENDING_MANUAL_ISSUE','ISSUING','ISSUED'].includes(String(t.status))))return [];
  const st=stateOf(c.state),search=searchByConversation.get(c.id),payment=c.payments[0];
  if(payment?.status==='PAID'||payment?.status==='REFUNDED')return [];
  const selected=st.selected_offer||null;
  let stage:RecoveryStage|null=null;
  if(payment&&['CREATED','PENDING','FAILED','EXPIRED'].includes(String(payment.status)))stage='PAYMENT_ABANDONED';
  else if(st.payment_option||st.payment_method||st.checkout_started_at)stage='CHECKOUT_STARTED';
  else if(selected||search?.selected)stage='OFFER_SELECTED';
  else if(search)stage='SEARCH_ABANDONED';
  if(!stage)return [];
  const observedAmount=payment?money(payment.amount):money(selected?.price_total??search?.selectedPrice??search?.prices?.[0]?.amount);
  const currency=String(payment?.currency||selected?.currency||search?.selectedCurrency||search?.prices?.[0]?.currency||'USD').toUpperCase();
  const ageHours=Math.max(0,Math.floor((Date.now()-c.updatedAt.getTime())/3600000));
  let priority=20;
  if(stage==='PAYMENT_ABANDONED')priority+=45;else if(stage==='CHECKOUT_STARTED')priority+=35;else if(stage==='OFFER_SELECTED')priority+=25;
  if(ageHours<=24)priority+=15;else if(ageHours<=72)priority+=8;
  if(observedAmount>0)priority+=10;
  priority=Math.min(100,priority);
  return [{conversationId:c.id,waId:c.waId,customer:c.customer||{id:c.customerId,displayName:null,phone:c.waId,email:null,country:c.country},stage,priority,ageHours,route:{origin:search?.origin||selected?.segments?.[0]?.origin||null,destination:search?.destination||selected?.segments?.at?.(-1)?.destination||null,departDate:search?.departDate||null},observedAmount,currency,paymentStatus:payment?.status||null,paymentReference:payment?.reference||null,expiresAt:payment?.expiresAt?.toISOString()||null,searchId:search?.id||null,lastActivityAt:c.updatedAt.toISOString()}];
 }).sort((a,b)=>b.priority-a.priority||new Date(b.lastActivityAt).getTime()-new Date(a.lastActivityAt).getTime());
 const byStage={SEARCH_ABANDONED:0,OFFER_SELECTED:0,CHECKOUT_STARTED:0,PAYMENT_ABANDONED:0};for(const x of opportunities)byStage[x.stage]++;
 const recoverableByCurrency=new Map<string,number>();for(const x of opportunities){if(x.observedAmount<=0)continue;recoverableByCurrency.set(x.currency,(recoverableByCurrency.get(x.currency)||0)+x.observedAmount);}
 const paid=await db.payment.findMany({where:{status:'PAID',updatedAt:{gte:from}},select:{amount:true,currency:true,providerPayload:true}});
 const recoveredByCurrency=new Map<string,number>();for(const p of paid){const payload=stateOf(p.providerPayload);if(payload.recovery_source!=='abandoned_booking')continue;const c=p.currency.toUpperCase();recoveredByCurrency.set(c,(recoveredByCurrency.get(c)||0)+money(p.amount));}
 return {periodDays:days,metrics:{total:opportunities.length,...byStage},recoverable:[...recoverableByCurrency.entries()].map(([currency,amount])=>({currency,amount})),recovered:[...recoveredByCurrency.entries()].map(([currency,amount])=>({currency,amount})),opportunities:opportunities.slice(0,100),generatedAt:new Date().toISOString()};
}
