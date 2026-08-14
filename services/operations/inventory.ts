import {db} from '@/lib/db';
import {audit} from '@/lib/audit';
import type {SafeUser} from '@/lib/auth/session';

const IATA=/^[A-Z]{3}$/;
const AIRLINE=/^[A-Z0-9]{2,3}$/;
function str(v:unknown){return String(v??'').trim();}
function num(v:unknown){const n=Number(v);return Number.isFinite(n)?n:NaN;}

export async function listInventory(){return (db as any).manualFlightInventory.findMany({orderBy:[{active:'desc'},{origin:'asc'},{destination:'asc'},{airlineCode:'asc'}]});}
export async function createInventory(input:any,user:SafeUser){
 const origin=str(input.origin).toUpperCase(),destination=str(input.destination).toUpperCase(),airlineCode=str(input.airlineCode).toUpperCase();
 const adultPrice=num(input.adultPrice),durationMinutes=Math.max(1,Math.trunc(num(input.durationMinutes)));
 if(!IATA.test(origin)||!IATA.test(destination))throw new Error('invalid_iata');
 if(!AIRLINE.test(airlineCode))throw new Error('invalid_airline_code');
 if(!str(input.flightNumber)||!str(input.airlineName)||!str(input.departureTime)||!str(input.arrivalTime))throw new Error('missing_required_field');
 if(!Number.isFinite(adultPrice)||adultPrice<0||!Number.isFinite(durationMinutes))throw new Error('invalid_numeric_value');
 const code=str(input.code)||`${airlineCode}${str(input.flightNumber)}-${origin}-${destination}`;
 const row=await (db as any).manualFlightInventory.create({data:{code,active:input.active!==false,origin,destination,airlineCode,airlineName:str(input.airlineName),flightNumber:str(input.flightNumber),departureTime:str(input.departureTime),arrivalTime:str(input.arrivalTime),durationMinutes,adultPrice,childPrice:input.childPrice===''||input.childPrice==null?null:num(input.childPrice),infantPrice:input.infantPrice===''||input.infantPrice==null?null:num(input.infantPrice),currency:str(input.currency||'USD').toUpperCase(),notes:str(input.notes)||null}});
 await audit({userId:user.id,action:'inventory.create',entity:'ManualFlightInventory',entityId:row.id,metadata:{code:row.code}});return row;
}
export async function updateInventory(id:string,input:any,user:SafeUser){
 const current=await (db as any).manualFlightInventory.findUnique({where:{id}});if(!current)throw new Error('inventory_not_found');
 const data:any={};
 for(const k of ['airlineName','flightNumber','departureTime','arrivalTime','notes'] as const)if(k in input)data[k]=str(input[k])||null;
 for(const k of ['origin','destination','airlineCode','currency'] as const)if(k in input)data[k]=str(input[k]).toUpperCase();
 if('active'in input)data.active=Boolean(input.active);
 for(const k of ['adultPrice','childPrice','infantPrice'] as const)if(k in input)data[k]=input[k]===''||input[k]==null?null:num(input[k]);
 if('durationMinutes'in input)data.durationMinutes=Math.max(1,Math.trunc(num(input.durationMinutes)));
 if(data.origin&&!IATA.test(data.origin))throw new Error('invalid_iata');if(data.destination&&!IATA.test(data.destination))throw new Error('invalid_iata');if(data.airlineCode&&!AIRLINE.test(data.airlineCode))throw new Error('invalid_airline_code');
 const row=await (db as any).manualFlightInventory.update({where:{id},data});await audit({userId:user.id,action:'inventory.update',entity:'ManualFlightInventory',entityId:id,metadata:{code:row.code,active:row.active}});return row;
}
export async function deleteInventory(id:string,user:SafeUser){const row=await (db as any).manualFlightInventory.delete({where:{id}});await audit({userId:user.id,action:'inventory.delete',entity:'ManualFlightInventory',entityId:id,metadata:{code:row.code}});return row;}
