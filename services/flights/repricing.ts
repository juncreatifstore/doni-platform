import type {FlightOffer} from './types';
import {fetchDuffelOffer} from '../providers/duffel';

export interface RepriceResult { ok:boolean; changed:boolean; oldPrice:number; newPrice:number; currency:string; newOffer:FlightOffer; reason?:string; }
function minutes(iso:string|undefined|null){if(!iso)return 0;const m=String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);return m?(+(m[1]||0))*60+(+(m[2]||0)):0;}
function normalizeDuffel(o:any):FlightOffer{const slices=Array.isArray(o?.slices)?o.slices:[];const segments:any[]=[];for(const sl of slices)for(const s of sl?.segments??[])segments.push({origin:s?.origin?.iata_code??'',destination:s?.destination?.iata_code??'',departure_at:s?.departing_at??null,arrival_at:s?.arriving_at??null,airline_code:s?.marketing_carrier?.iata_code??s?.operating_carrier?.iata_code??'',airline_name:s?.marketing_carrier?.name??s?.operating_carrier?.name??'',flight_number:s?.marketing_carrier_flight_number??'',duration_minutes:minutes(s?.duration)});return{offer_id:String(o?.id??''),provider:'duffel',price_total:Number(o?.total_amount??0),currency:String(o?.total_currency??'USD'),segments,expires_at:o?.expires_at??null,_total_duration:segments.reduce((n,s)=>n+s.duration_minutes,0),_stops:Math.max(0,segments.length-slices.length)};}
export async function repriceOffer(offer:FlightOffer):Promise<RepriceResult>{
 const oldPrice=Number(offer.price_total||0);
 if(offer.provider!=='duffel') return {ok:true,changed:false,oldPrice,newPrice:oldPrice,currency:offer.currency,newOffer:offer};
 if(process.env.DUFFEL_REPRICE_ENABLED!=='true') return {ok:true,changed:false,oldPrice,newPrice:oldPrice,currency:offer.currency,newOffer:offer,reason:'duffel_reprice_disabled'};
 const raw=await fetchDuffelOffer(offer.offer_id);
 if(!raw)return {ok:false,changed:false,oldPrice,newPrice:oldPrice,currency:offer.currency,newOffer:offer,reason:'offer_unavailable'};
 const next=normalizeDuffel(raw); const newPrice=Number(next.price_total||0); const changed=Math.abs(newPrice-oldPrice)>=0.01 || next.currency!==offer.currency;
 return {ok:true,changed,oldPrice,newPrice,currency:next.currency,newOffer:next};
}
export function money(amount:number,currency:string){try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(amount);}catch{return `${amount.toFixed(2)} ${currency}`;}}
