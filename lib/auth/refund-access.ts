import {db} from '@/lib/db';
import type {SafeUser} from '@/lib/auth/session';
import {dataScopeForUser,ticketReferenceAllowed} from '@/lib/auth/data-scope';

export async function refundIdsForUser(user:SafeUser){
 const scope=dataScopeForUser(user);
 if(scope.mode==='none')return [] as string[];
 if(scope.mode==='global')return null;
 const [payments,tickets]=await Promise.all([
  db.payment.findMany({where:{conversation:{country:scope.country}},select:{id:true}}),
  db.ticket.findMany({where:{conversation:{country:scope.country}},select:{reference:true}}),
 ]);
 const rows:any[]=await (db as any).refundRequest.findMany({where:{OR:[{paymentId:{in:payments.map(p=>p.id)}},{ticketReference:{in:tickets.map(t=>t.reference)}}]},select:{id:true}});
 return rows.map(r=>String(r.id));
}

export async function refundAllowed(user:SafeUser,refundId:string){
 const scope=dataScopeForUser(user);
 if(scope.mode==='global')return true;
 if(scope.mode==='none')return false;
 const row:any=await (db as any).refundRequest.findUnique({where:{id:refundId},select:{paymentId:true,ticketReference:true}});
 if(!row)return false;
 if(row.paymentId){const count=await db.payment.count({where:{id:String(row.paymentId),conversation:{country:scope.country}}});if(count>0)return true;}
 return ticketReferenceAllowed(scope,row.ticketReference?String(row.ticketReference):null);
}

export async function refundInputAllowed(user:SafeUser,input:any){
 const scope=dataScopeForUser(user);
 if(scope.mode==='global')return true;
 if(scope.mode==='none')return false;
 const postBookingId=String(input?.postBookingId||'')||null;
 let reference=String(input?.reference||'').trim().toUpperCase();
 if(!reference&&postBookingId){const pb:any=await (db as any).postBookingRequest.findUnique({where:{id:postBookingId},select:{reference:true}});reference=String(pb?.reference||'').trim().toUpperCase();}
 return ticketReferenceAllowed(scope,reference||null);
}
