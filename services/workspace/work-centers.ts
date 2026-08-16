import {db} from '@/lib/db';

const OPEN_POST=['request_created','waiting_admin_review','waiting_airline_confirmation','penalty_pending','waiting_customer_payment'];

export async function getReservationsWorkCenter(){
 const [pendingPayments,ticketsToIssue,activeConversations,recentTickets]=await Promise.all([
  db.payment.findMany({where:{status:'PENDING'},orderBy:{updatedAt:'asc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  db.ticket.findMany({where:{status:{in:['CREATED','TO_BE_PAID','PENDING_MANUAL_ISSUE','ISSUING']}},orderBy:{updatedAt:'asc'},take:8,select:{reference:true,status:true,pnr:true,updatedAt:true}}),
  db.doniConversation.findMany({where:{status:'ACTIVE'},orderBy:{updatedAt:'asc'},take:8,select:{id:true,waId:true,country:true,currentSegment:true,agentRequired:true,updatedAt:true}}),
  db.ticket.findMany({where:{status:'ISSUED'},orderBy:{issuedAt:'desc'},take:6,select:{reference:true,pnr:true,deliveryStatus:true,issuedAt:true}}),
 ]);
 return {pendingPayments,ticketsToIssue,activeConversations,recentTickets};
}

export async function getCustomerServiceWorkCenter(){
 const [agentRequired,postBooking,checkins,baggage]=await Promise.all([
  db.doniConversation.findMany({where:{status:'ACTIVE',agentRequired:true},orderBy:{updatedAt:'asc'},take:10,select:{id:true,waId:true,country:true,language:true,currentSegment:true,updatedAt:true}}),
  db.postBookingRequest.findMany({where:{status:{in:OPEN_POST}},orderBy:[{priority:'desc'},{createdAt:'asc'}],take:10,select:{id:true,reference:true,requestType:true,status:true,priority:true,phone:true,createdAt:true}}),
  db.checkinService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:8,select:{id:true,status:true,paymentStatus:true,tracking:{select:{ticketReference:true,airlineCode:true,flightNumber:true,scheduledDeparture:true,clientPhone:true}}}}),
  db.baggageService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:8,select:{id:true,status:true,quantity:true,weightKg:true,paymentStatus:true,tracking:{select:{ticketReference:true,clientPhone:true}}}}),
 ]);
 return {agentRequired,postBooking,checkins,baggage};
}

export async function getFinanceWorkCenter(){
 const [manualReviews,pendingPayments,refunds,failedPayments]=await Promise.all([
  db.manualPaymentReview.findMany({where:{status:{in:['PENDING','NEEDS_INFO']}},orderBy:{createdAt:'asc'},take:10,select:{id:true,status:true,ocrStatus:true,createdAt:true,payment:{select:{reference:true,amount:true,currency:true,provider:true}}}}),
  db.payment.findMany({where:{status:'PENDING'},orderBy:{updatedAt:'asc'},take:10,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  db.refundRequest.findMany({where:{status:{notIn:['completed','rejected','cancelled']}},orderBy:{createdAt:'asc'},take:10,select:{id:true,ticketReference:true,amount:true,currency:true,status:true,reason:true,createdAt:true}}),
  db.payment.findMany({where:{status:{in:['FAILED','EXPIRED']}},orderBy:{updatedAt:'desc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,status:true,updatedAt:true}}),
 ]);
 return {manualReviews,pendingPayments,refunds,failedPayments};
}

export async function getMarketingWorkCenter(){
 const day=new Date(Date.now()-24*3600000),week=new Date(Date.now()-7*24*3600000);
 const [newCustomers,started,paid,topCountries,recentCustomers]=await Promise.all([
  db.customerProfile.count({where:{createdAt:{gte:week}}}),
  db.doniConversation.count({where:{createdAt:{gte:day}}}),
  db.payment.count({where:{status:'PAID',updatedAt:{gte:day}}}),
  db.customerProfile.groupBy({by:['country'],where:{createdAt:{gte:week}},_count:{_all:true},orderBy:{_count:{country:'desc'}},take:6}),
  db.customerProfile.findMany({orderBy:{lastSeenAt:'desc'},take:8,select:{customerCode:true,displayName:true,country:true,preferredLanguage:true,lastSeenAt:true}}),
 ]);
 const conversion=started?Math.round((paid/started)*1000)/10:0;
 return {newCustomers,started,paid,conversion,topCountries:topCountries.map(x=>({country:x.country||'Non défini',count:x._count._all})),recentCustomers};
}

export async function getManagementWorkCenter(){
 const [users,activeConversations,openIncidents,pendingRefunds,pendingReviews,ticketsToIssue]=await Promise.all([
  db.portalUser.count({where:{active:true}}),
  db.doniConversation.count({where:{status:'ACTIVE'}}),
  db.flightIncident.count({where:{status:{in:['open','acknowledged']}}}),
  db.refundRequest.count({where:{status:{notIn:['completed','rejected','cancelled']}}}),
  db.manualPaymentReview.count({where:{status:{in:['PENDING','NEEDS_INFO']}}}),
  db.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']}}}),
 ]);
 return {users,activeConversations,openIncidents,pendingRefunds,pendingReviews,ticketsToIssue};
}
