import {db} from '@/lib/db';

const OPEN_POST=['request_created','waiting_admin_review','waiting_airline_confirmation','penalty_pending','waiting_customer_payment'];
const prisma:any=db as any;

export async function getReservationsWorkCenter(){
 const [pendingPayments,ticketsToIssue,activeConversations,recentTickets]=await Promise.all([
  prisma.payment.findMany({where:{status:'PENDING'},orderBy:{updatedAt:'asc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  prisma.ticket.findMany({where:{status:{in:['CREATED','TO_BE_PAID','PENDING_MANUAL_ISSUE','ISSUING']}},orderBy:{updatedAt:'asc'},take:8,select:{reference:true,status:true,pnr:true,updatedAt:true}}),
  prisma.doniConversation.findMany({where:{status:'ACTIVE'},orderBy:{updatedAt:'asc'},take:8,select:{id:true,waId:true,country:true,currentSegment:true,agentRequired:true,updatedAt:true}}),
  prisma.ticket.findMany({where:{status:'ISSUED'},orderBy:{issuedAt:'desc'},take:6,select:{reference:true,pnr:true,deliveryStatus:true,issuedAt:true}}),
 ]);
 return {pendingPayments,ticketsToIssue,activeConversations,recentTickets};
}

export async function getCustomerServiceWorkCenter(){
 const [agentRequired,postBooking,checkins,baggage]=await Promise.all([
  prisma.doniConversation.findMany({where:{status:'ACTIVE',agentRequired:true},orderBy:{updatedAt:'asc'},take:10,select:{id:true,waId:true,country:true,language:true,currentSegment:true,updatedAt:true}}),
  prisma.postBookingRequest.findMany({where:{status:{in:OPEN_POST}},orderBy:[{priority:'desc'},{createdAt:'asc'}],take:10,select:{id:true,reference:true,requestType:true,status:true,priority:true,phone:true,createdAt:true}}),
  prisma.checkinService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:8,select:{id:true,status:true,paymentStatus:true,tracking:{select:{ticketReference:true,airlineCode:true,flightNumber:true,scheduledDeparture:true,clientPhone:true}}}}),
  prisma.baggageService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:8,select:{id:true,status:true,quantity:true,weightKg:true,paymentStatus:true,tracking:{select:{ticketReference:true,clientPhone:true}}}}),
 ]);
 return {agentRequired,postBooking,checkins,baggage};
}

export async function getFinanceWorkCenter(){
 const [manualReviews,pendingPayments,refunds,failedPayments]=await Promise.all([
  prisma.manualPaymentReview.findMany({where:{status:{in:['PENDING','NEEDS_INFO']}},orderBy:{createdAt:'asc'},take:10,select:{id:true,status:true,ocrStatus:true,createdAt:true,payment:{select:{reference:true,amount:true,currency:true,provider:true}}}}),
  prisma.payment.findMany({where:{status:'PENDING'},orderBy:{updatedAt:'asc'},take:10,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  prisma.refundRequest.findMany({where:{status:{notIn:['completed','rejected','cancelled']}},orderBy:{createdAt:'asc'},take:10,select:{id:true,ticketReference:true,amount:true,currency:true,status:true,reason:true,createdAt:true}}),
  prisma.payment.findMany({where:{status:{in:['FAILED','EXPIRED']}},orderBy:{updatedAt:'desc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,status:true,updatedAt:true}}),
 ]);
 return {manualReviews,pendingPayments,refunds,failedPayments};
}

export async function getMarketingWorkCenter(){
 const day=new Date(Date.now()-24*3600000),week=new Date(Date.now()-7*24*3600000);
 const [newCustomers,started,paid,topCountries,recentCustomers]=await Promise.all([
  prisma.customerProfile.count({where:{createdAt:{gte:week}}}),
  prisma.doniConversation.count({where:{createdAt:{gte:day}}}),
  prisma.payment.count({where:{status:'PAID',updatedAt:{gte:day}}}),
  prisma.customerProfile.groupBy({by:['country'],where:{createdAt:{gte:week}},_count:{_all:true},orderBy:{_count:{country:'desc'}},take:6}),
  prisma.customerProfile.findMany({orderBy:{lastSeenAt:'desc'},take:8,select:{customerCode:true,displayName:true,country:true,preferredLanguage:true,lastSeenAt:true}}),
 ]);
 const conversion=started?Math.round((paid/started)*1000)/10:0;
 return {newCustomers,started,paid,conversion,topCountries:(topCountries as any[]).map((x:any)=>({country:x.country||'Non défini',count:x._count?._all||0})),recentCustomers};
}

export async function getManagementWorkCenter(){
 const [users,activeConversations,openIncidents,pendingRefunds,pendingReviews,ticketsToIssue]=await Promise.all([
  prisma.portalUser.count({where:{active:true}}),
  prisma.doniConversation.count({where:{status:'ACTIVE'}}),
  prisma.flightIncident.count({where:{status:{in:['open','acknowledged']}}}),
  prisma.refundRequest.count({where:{status:{notIn:['completed','rejected','cancelled']}}}),
  prisma.manualPaymentReview.count({where:{status:{in:['PENDING','NEEDS_INFO']}}}),
  prisma.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']}}}),
 ]);
 return {users,activeConversations,openIncidents,pendingRefunds,pendingReviews,ticketsToIssue};
}
