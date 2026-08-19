import {db} from '@/lib/db';
import type {DataScope} from '@/lib/auth/data-scope';
import {allowedTicketReferences,conversationCountryWhere,countryWhere} from '@/lib/auth/data-scope';

const DAY=24*60*60*1000;
export async function getWorkspaceMetrics(scope:DataScope={mode:'global'}){
 const last24h=new Date(Date.now()-DAY);
 if(scope.mode==='none')return {customers:0,openPostBooking:0,pendingManualReviews:0,pendingRefunds:0,activeFlights:0,openIncidents:0,activeCheckins:0,activeBaggage:0,failedDeliveries:0};
 const refs=await allowedTicketReferences(scope);const refWhere=refs===null?{}:{ticketReference:{in:refs}};const requestRefWhere=refs===null?{}:{reference:{in:refs}};const refundRefWhere=refs===null?{}:{ticketReference:{in:refs}};
 const [customers,openPostBooking,pendingManualReviews,pendingRefunds,activeFlights,activeCheckins,activeBaggage,failedDeliveries]=await Promise.all([
  db.customerProfile.count({where:countryWhere(scope)}),
  db.postBookingRequest.count({where:{status:{notIn:['resolved','closed','cancelled']},...requestRefWhere}}).catch(()=>0),
  db.manualPaymentReview.count({where:{status:'PENDING',payment:conversationCountryWhere(scope)}}).catch(()=>0),
  db.refundRequest.count({where:{status:{in:['requested','pending','approved']},...refundRefWhere}}).catch(()=>0),
  db.flightTracking.count({where:{active:true,...refWhere}}).catch(()=>0),
  db.checkinService.count({where:{status:{in:['offered','accepted','payment_pending']},tracking:refWhere}}).catch(()=>0),
  db.baggageService.count({where:{status:{in:['requested','pending','payment_pending']},tracking:refWhere}}).catch(()=>0),
  db.ticket.count({where:{deliveryStatus:'FAILED',updatedAt:{gte:last24h},...conversationCountryWhere(scope)}}).catch(()=>0),
 ]);
 const openIncidents=scope.mode==='global'?await db.flightIncident.count({where:{status:{in:['open','acknowledged']}}}).catch(()=>0):0;
 return {customers,openPostBooking,pendingManualReviews,pendingRefunds,activeFlights,openIncidents,activeCheckins,activeBaggage,failedDeliveries};
}
