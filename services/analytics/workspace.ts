import {db} from '@/lib/db';

const DAY=24*60*60*1000;
export async function getWorkspaceMetrics(){
 const last24h=new Date(Date.now()-DAY);
 const [customers,openPostBooking,pendingManualReviews,pendingRefunds,activeFlights,openIncidents,activeCheckins,activeBaggage,failedDeliveries]=await Promise.all([
  db.customerProfile.count(),
  db.postBookingRequest.count({where:{status:{notIn:['resolved','closed','cancelled']}}}).catch(()=>0),
  db.manualPaymentReview.count({where:{status:'PENDING'}}).catch(()=>0),
  db.refundRequest.count({where:{status:{in:['requested','pending','approved']}}}).catch(()=>0),
  db.flightTracking.count({where:{active:true}}).catch(()=>0),
  db.flightIncident.count({where:{status:{in:['open','acknowledged']}}}).catch(()=>0),
  db.checkinService.count({where:{status:{in:['offered','accepted','payment_pending']}}}).catch(()=>0),
  db.baggageService.count({where:{status:{in:['requested','pending','payment_pending']}}}).catch(()=>0),
  db.ticketDelivery.count({where:{status:'failed',createdAt:{gte:last24h}}}).catch(()=>0),
 ]);
 return {customers,openPostBooking,pendingManualReviews,pendingRefunds,activeFlights,openIncidents,activeCheckins,activeBaggage,failedDeliveries};
}
