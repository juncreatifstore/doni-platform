import {db} from '@/lib/db';
import type {DataScope} from '@/lib/auth/data-scope';
import {allowedTicketReferences,conversationCountryWhere,countryWhere,dataScopeForUser} from '@/lib/auth/data-scope';
import {getCurrentUser} from '@/lib/auth/session';

const OPEN_POST=['request_created','waiting_admin_review','waiting_airline_confirmation','penalty_pending','waiting_customer_payment'];
const prisma:any=db as any;
async function resolveScope(scope?:DataScope):Promise<DataScope>{if(scope)return scope;const user=await getCurrentUser();return user?dataScopeForUser(user):{mode:'none'};}

export async function getReservationsWorkCenter(scope:DataScope={mode:'global'}){
 const paymentWhere={status:'PENDING',...conversationCountryWhere(scope)};
 const ticketWhere={status:{in:['CREATED','TO_BE_PAID','PENDING_MANUAL_ISSUE','ISSUING']},...conversationCountryWhere(scope)};
 const conversationWhere={status:'ACTIVE',...countryWhere(scope)};
 const recentTicketWhere={status:'ISSUED',...conversationCountryWhere(scope)};
 const [pendingPayments,ticketsToIssue,activeConversations,recentTickets]=await Promise.all([
  prisma.payment.findMany({where:paymentWhere,orderBy:{updatedAt:'asc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  prisma.ticket.findMany({where:ticketWhere,orderBy:{updatedAt:'asc'},take:8,select:{reference:true,status:true,pnr:true,updatedAt:true}}),
  prisma.doniConversation.findMany({where:conversationWhere,orderBy:{updatedAt:'asc'},take:8,select:{id:true,waId:true,country:true,currentSegment:true,agentRequired:true,updatedAt:true}}),
  prisma.ticket.findMany({where:recentTicketWhere,orderBy:{issuedAt:'desc'},take:6,select:{reference:true,pnr:true,deliveryStatus:true,issuedAt:true}}),
 ]);
 return {pendingPayments,ticketsToIssue,activeConversations,recentTickets};
}

export async function getCustomerServiceWorkCenter(scope:DataScope={mode:'global'}){
 const refs=await allowedTicketReferences(scope);
 const [agentRequired,rawPostBooking,rawCheckins,rawBaggage]=await Promise.all([
  prisma.doniConversation.findMany({where:{status:'ACTIVE',agentRequired:true,...countryWhere(scope)},orderBy:{updatedAt:'asc'},take:10,select:{id:true,waId:true,country:true,language:true,currentSegment:true,updatedAt:true}}),
  scope.mode==='none'?Promise.resolve([]):prisma.postBookingRequest.findMany({where:{status:{in:OPEN_POST}},orderBy:[{priority:'desc'},{createdAt:'asc'}],take:30,select:{id:true,reference:true,requestType:true,status:true,priority:true,phone:true,createdAt:true}}),
  scope.mode==='none'?Promise.resolve([]):prisma.checkinService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:30,select:{id:true,status:true,paymentStatus:true,tracking:{select:{ticketReference:true,airlineCode:true,flightNumber:true,scheduledDeparture:true,clientPhone:true}}}}),
  scope.mode==='none'?Promise.resolve([]):prisma.baggageService.findMany({where:{status:{notIn:['completed','cancelled']}},orderBy:{updatedAt:'asc'},take:30,select:{id:true,status:true,quantity:true,weightKg:true,paymentStatus:true,tracking:{select:{ticketReference:true,clientPhone:true}}}}),
 ]);
 const inScope=(ref:any)=>refs===null||refs.includes(String(ref||''));
 return {agentRequired,postBooking:rawPostBooking.filter((x:any)=>inScope(x.reference)).slice(0,10),checkins:rawCheckins.filter((x:any)=>inScope(x.tracking?.ticketReference)).slice(0,8),baggage:rawBaggage.filter((x:any)=>inScope(x.tracking?.ticketReference)).slice(0,8)};
}

export async function getFinanceWorkCenter(scope:DataScope={mode:'global'}){
 const paymentScope=conversationCountryWhere(scope);
 const [manualReviews,pendingPayments,rawRefunds,failedPayments]=await Promise.all([
  scope.mode==='none'?Promise.resolve([]):prisma.manualPaymentReview.findMany({where:{status:{in:['PENDING','NEEDS_INFO']},payment:paymentScope},orderBy:{createdAt:'asc'},take:10,select:{id:true,status:true,ocrStatus:true,createdAt:true,payment:{select:{reference:true,amount:true,currency:true,provider:true}}}}),
  prisma.payment.findMany({where:{status:'PENDING',...paymentScope},orderBy:{updatedAt:'asc'},take:10,select:{reference:true,amount:true,currency:true,provider:true,updatedAt:true}}),
  scope.mode==='none'?Promise.resolve([]):prisma.refundRequest.findMany({where:{status:{notIn:['completed','rejected','cancelled']}},orderBy:{createdAt:'asc'},take:30,select:{id:true,ticketReference:true,amount:true,currency:true,status:true,reason:true,createdAt:true}}),
  prisma.payment.findMany({where:{status:{in:['FAILED','EXPIRED']},...paymentScope},orderBy:{updatedAt:'desc'},take:8,select:{reference:true,amount:true,currency:true,provider:true,status:true,updatedAt:true}}),
 ]);
 let refunds=rawRefunds;
 if(scope.mode==='country'&&rawRefunds.length){const refs=rawRefunds.map((x:any)=>x.ticketReference).filter(Boolean);const allowed=refs.length?await prisma.ticket.findMany({where:{reference:{in:refs},...conversationCountryWhere(scope)},select:{reference:true}}):[];const allowedRefs=new Set(allowed.map((x:any)=>x.reference));refunds=rawRefunds.filter((x:any)=>x.ticketReference&&allowedRefs.has(x.ticketReference));}
 return {manualReviews,pendingPayments,refunds:refunds.slice(0,10),failedPayments};
}

export async function getMarketingWorkCenter(inputScope?:DataScope){
 const scope=await resolveScope(inputScope);const day=new Date(Date.now()-24*3600000),week=new Date(Date.now()-7*24*3600000);const customerScope=countryWhere(scope),conversationScope=countryWhere(scope),paymentScope=conversationCountryWhere(scope);
 const [newCustomers,started,paid,topCountries,recentCustomers]=await Promise.all([
  prisma.customerProfile.count({where:{createdAt:{gte:week},...customerScope}}),
  prisma.doniConversation.count({where:{createdAt:{gte:day},...conversationScope}}),
  prisma.payment.count({where:{status:'PAID',updatedAt:{gte:day},...paymentScope}}),
  prisma.customerProfile.groupBy({by:['country'],where:{createdAt:{gte:week},...customerScope},_count:{_all:true},orderBy:{_count:{country:'desc'}},take:6}),
  prisma.customerProfile.findMany({where:customerScope,orderBy:{lastSeenAt:'desc'},take:8,select:{customerCode:true,displayName:true,country:true,preferredLanguage:true,lastSeenAt:true}}),
 ]);
 const conversion=started?Math.round((paid/started)*1000)/10:0;
 return {newCustomers,started,paid,conversion,topCountries:(topCountries as any[]).map((x:any)=>({country:x.country||'Non défini',count:x._count?._all||0})),recentCustomers};
}

export async function getManagementWorkCenter(inputScope?:DataScope){
 const scope=await resolveScope(inputScope);const refs=await allowedTicketReferences(scope);const refundRefWhere=refs===null?{}:{ticketReference:{in:refs}};
 const [users,activeConversations,pendingRefunds,pendingReviews,ticketsToIssue]=await Promise.all([
  prisma.portalUser.count({where:{active:true,...countryWhere(scope)}}),
  prisma.doniConversation.count({where:{status:'ACTIVE',...countryWhere(scope)}}),
  prisma.refundRequest.count({where:{status:{notIn:['completed','rejected','cancelled']},...refundRefWhere}}),
  prisma.manualPaymentReview.count({where:{status:{in:['PENDING','NEEDS_INFO']},payment:conversationCountryWhere(scope)}}),
  prisma.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']},...conversationCountryWhere(scope)}}),
 ]);
 const openIncidents=scope.mode==='global'?await prisma.flightIncident.count({where:{status:{in:['open','acknowledged']}}}):0;
 return {users,activeConversations,openIncidents,pendingRefunds,pendingReviews,ticketsToIssue};
}
