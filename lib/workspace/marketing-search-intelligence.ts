import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import type {FlightCriteria,FlightOffer} from '@/services/flights/types';

const CATEGORY='Marketing Search Intelligence',PREFIX='marketing.search.';
const DAY=86400000;
export type SearchPriceObservation={currency:string;amount:number};
export type MarketingSearchEvent={
 id:string;conversationId:string;customerId?:string|null;waId:string;origin?:string|null;destination?:string|null;departDate?:string|null;returnDate?:string|null;tripType?:string|null;passengers:number;providers:string[];offersCount:number;prices:SearchPriceObservation[];selected:boolean;selectedOfferId?:string|null;selectedPrice?:number|null;selectedCurrency?:string|null;searchedAt:string;selectedAt?:string|null;
};
function parse(v:unknown):MarketingSearchEvent|null{if(!v||typeof v!=='object')return null;const x=v as MarketingSearchEvent;return x.id&&x.conversationId&&x.waId&&x.searchedAt?x:null;}
function lowestByCurrency(offers:FlightOffer[]){const m=new Map<string,number>();for(const o of offers){if(!o.currency||!Number.isFinite(o.price_total))continue;const prev=m.get(o.currency);if(prev===undefined||o.price_total<prev)m.set(o.currency,o.price_total);}return [...m.entries()].map(([currency,amount])=>({currency,amount})).sort((a,b)=>a.currency.localeCompare(b.currency));}
function passengerCount(c:FlightCriteria){const p=c.passengers;return Math.max(1,(p?.adults||1)+(p?.children||0)+(p?.infants||0));}
export async function recordMarketingFlightSearch(input:{conversationId:string;waId:string;criteria:FlightCriteria;offers:FlightOffer[];providers:string[]}){
 const now=new Date().toISOString(),id=randomUUID();
 const c=await db.doniConversation.findUnique({where:{id:input.conversationId},select:{customerId:true,waId:true}}).catch(()=>null);
 const e:MarketingSearchEvent={id,conversationId:input.conversationId,customerId:c?.customerId||null,waId:c?.waId||input.waId,origin:input.criteria.origin||null,destination:input.criteria.destination||null,departDate:input.criteria.depart_date||null,returnDate:input.criteria.return_date||null,tripType:input.criteria.trip_type||null,passengers:passengerCount(input.criteria),providers:[...new Set(input.providers)],offersCount:input.offers.length,prices:lowestByCurrency(input.offers),selected:false,selectedOfferId:null,selectedPrice:null,selectedCurrency:null,searchedAt:now,selectedAt:null};
 await db.appSetting.create({data:{key:`${PREFIX}${id}`,category:CATEGORY,value:e as any}});
 return e;
}
export async function markMarketingFlightSearchSelected(id:string,offer:FlightOffer){const key=`${PREFIX}${id}`;const row=await db.appSetting.findUnique({where:{key}});const current=parse(row?.value);if(!current)return null;const next:MarketingSearchEvent={...current,selected:true,selectedOfferId:offer.offer_id,selectedPrice:offer.price_total,selectedCurrency:offer.currency,selectedAt:new Date().toISOString()};await db.appSetting.update({where:{key},data:{value:next as any}});return next;}
export async function listMarketingFlightSearches(days=90){const from=Date.now()-Math.max(1,Math.min(days,365))*DAY;const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{createdAt:'desc'}});return rows.map(r=>parse(r.value)).filter((x):x is MarketingSearchEvent=>Boolean(x&&new Date(x.searchedAt).getTime()>=from));}

export async function getMarketingSearchIntelligence(days=30){
 const searches=await listMarketingFlightSearches(Math.max(days,90));const from=Date.now()-days*DAY,recent=searches.filter(x=>new Date(x.searchedAt).getTime()>=from);
 const ids=[...new Set(recent.map(x=>x.customerId).filter((x):x is string=>Boolean(x)))];
 const [customers,paid]=await Promise.all([
  ids.length?db.customerProfile.findMany({where:{id:{in:ids}},select:{id:true,displayName:true,phone:true,email:true,country:true}}):Promise.resolve([]),
  ids.length?db.payment.findMany({where:{status:'PAID',conversation:{customerId:{in:ids}}},select:{conversation:{select:{customerId:true}}}}):Promise.resolve([])
 ]);
 const customerMap=new Map(customers.map(x=>[x.id,x]));const paidCustomers=new Set(paid.map(x=>x.conversation?.customerId).filter(Boolean));
 const groups=new Map<string,MarketingSearchEvent[]>();for(const s of recent){const k=s.customerId?`c:${s.customerId}`:`w:${s.waId}`;const a=groups.get(k)||[];a.push(s);groups.set(k,a);}
 const opportunities=[...groups.entries()].map(([key,items])=>{items.sort((a,b)=>new Date(b.searchedAt).getTime()-new Date(a.searchedAt).getTime());const latest=items[0],sameDestination=items.filter(x=>x.destination&&x.destination===latest.destination).length;const age=Date.now()-new Date(latest.searchedAt).getTime();const dep=latest.departDate?new Date(`${latest.departDate}T00:00:00Z`).getTime():NaN;const daysToTravel=Number.isFinite(dep)?Math.ceil((dep-Date.now())/DAY):null;let score=0;if(items.length>=2)score+=25;if(sameDestination>=2)score+=15;if(items.some(x=>x.selected))score+=20;if(daysToTravel!==null&&daysToTravel>=0&&daysToTravel<=30)score+=20;if(age<=DAY)score+=10;if(latest.customerId&&paidCustomers.has(latest.customerId))score+=10;score=Math.min(100,score);const level=score>=75?'VERY_HIGH':score>=50?'HIGH':score>=25?'MEDIUM':'LOW';const customer=latest.customerId?customerMap.get(latest.customerId):null;return {key,score,level,searches:items.length,sameDestination,selected:items.some(x=>x.selected),latest,customer:customer||{id:latest.customerId||null,displayName:null,phone:latest.waId,email:null,country:null},returningCustomer:Boolean(latest.customerId&&paidCustomers.has(latest.customerId))};}).sort((a,b)=>b.score-a.score||new Date(b.latest.searchedAt).getTime()-new Date(a.latest.searchedAt).getTime());
 const destinationMap=new Map<string,{searches:number,people:Set<string>,selected:number}>();for(const s of recent){if(!s.destination)continue;const r=destinationMap.get(s.destination)||{searches:0,people:new Set<string>(),selected:0};r.searches++;r.people.add(s.customerId||s.waId);if(s.selected)r.selected++;destinationMap.set(s.destination,r);}const destinations=[...destinationMap.entries()].map(([destination,v])=>({destination,searches:v.searches,people:v.people.size,selected:v.selected})).sort((a,b)=>b.searches-a.searches).slice(0,12);
 const priceMap=new Map<string,number>();for(const s of recent)for(const p of s.prices){const k=`${s.origin||'?'}-${s.destination||'?'}|${p.currency}`;const prev=priceMap.get(k);if(prev===undefined||p.amount<prev)priceMap.set(k,p.amount);}const priceObservations=[...priceMap.entries()].map(([key,amount])=>{const [route,currency]=key.split('|');return {route,currency,amount};}).slice(0,20);
 const veryHigh=opportunities.filter(x=>x.level==='VERY_HIGH').length,high=opportunities.filter(x=>x.level==='HIGH').length;
 return {periodDays:days,metrics:{searches:recent.length,identified:new Set(recent.map(x=>x.customerId).filter(Boolean)).size,highIntent:veryHigh+high,selected:recent.filter(x=>x.selected).length},opportunities:opportunities.slice(0,40),destinations,priceObservations,recent:recent.slice(0,100),generatedAt:new Date().toISOString()};
}
