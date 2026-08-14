import {db} from '@/lib/db';
import {getSetting} from '@/lib/settings/service';
import type {FlightCriteria,FlightOffer,ProviderSearchResult} from '@/services/flights/types';
const seed=[
 {code:'SU401',origin:'PAP',destination:'SDQ',airlineCode:'SU',airlineName:'Sunrise Airways',flightNumber:'401',departureTime:'08:00',arrivalTime:'09:30',durationMinutes:90,adultPrice:175,currency:'USD'},
 {code:'SU402',origin:'SDQ',destination:'PAP',airlineCode:'SU',airlineName:'Sunrise Airways',flightNumber:'402',departureTime:'15:00',arrivalTime:'16:30',durationMinutes:90,adultPrice:175,currency:'USD'},
 {code:'BQ201',origin:'SDQ',destination:'CAP',airlineCode:'BQ',airlineName:'Sky High Aviation',flightNumber:'201',departureTime:'10:00',arrivalTime:'11:00',durationMinutes:60,adultPrice:195,currency:'USD'},
 {code:'2O301',origin:'SDQ',destination:'MEX',airlineCode:'2O',airlineName:'Arajet',flightNumber:'301',departureTime:'07:00',arrivalTime:'10:00',durationMinutes:180,adultPrice:285,currency:'USD'},
 {code:'VB101',origin:'MEX',destination:'CUN',airlineCode:'VB',airlineName:'Viva Aerobus',flightNumber:'101',departureTime:'06:30',arrivalTime:'08:30',durationMinutes:120,adultPrice:1200,currency:'MXN'},
];
function dt(date:string,time:string){return `${date}T${time}:00`;}
export async function searchManualInventory(c:FlightCriteria):Promise<ProviderSearchResult>{
 if(!(await getSetting<boolean>('flights.manual_inventory_enabled'))) return {offers:[],error:'manual_inventory_disabled'};
 const origin=(c.origin||'').toUpperCase(),destination=(c.destination||'').toUpperCase(),date=c.depart_date||'';
 let rows:any[]=[]; try{rows=await (db as any).manualFlightInventory.findMany({where:{active:true,origin,destination},orderBy:{adultPrice:'asc'}})}catch{}
 if(!rows.length) rows=seed.filter(x=>x.origin===origin&&x.destination===destination);
 const p=c.passengers||{adults:1,children:0,infants:0};
 const offers:FlightOffer[]=rows.filter(r=>!c.airline_preference||r.airlineCode===c.airline_preference).map(r=>{
   const adult=Number(r.adultPrice),child=r.childPrice==null?adult*.75:Number(r.childPrice),infant=r.infantPrice==null?adult*.1:Number(r.infantPrice);
   return {offer_id:`mi_${r.code}_${date}_${origin}_${destination}`,provider:'manual_inventory',price_total:Math.round((adult*p.adults+child*p.children+infant*p.infants)*100)/100,currency:r.currency,segments:[{origin,destination,departure_at:dt(date,r.departureTime),arrival_at:dt(date,r.arrivalTime),airline_code:r.airlineCode,airline_name:r.airlineName,flight_number:r.flightNumber,duration_minutes:Number(r.durationMinutes)}]};
 });
 return {offers};
}
