import {db} from '@/lib/db';
import type {Department} from '@/lib/auth/departments';
import type {OrgRole} from '@/lib/auth/org-roles';
import {allowedTicketReferences,conversationCountryWhere,countryWhere,dataScopeForUser} from '@/lib/auth/data-scope';

type WorkHubUser={id:string;role:string;department?:Department|null;orgRole:OrgRole;country?:string|null};
const STALE_MS=15*60*1000;

export async function getWorkHubMetrics(user:WorkHubUser){
 const staleAt=new Date(Date.now()-STALE_MS);const scope=dataScopeForUser(user as any);const conversationScope=countryWhere(scope),linkedScope=conversationCountryWhere(scope);const refs=await allowedTicketReferences(scope);const requestRefWhere=refs===null?{}:{reference:{in:refs}};const refWhere=refs===null?{}:{ticketReference:{in:refs}};
 const [myActiveConversations,myAttentionConversations,unassignedAttention,stalledConversations,pendingPayments,pendingManualReviews,ticketsToIssue,openPostBooking,activeCheckins,activeBaggage]=await Promise.all([
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id,...conversationScope}}):Promise.resolve(0),
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id,agentRequired:true,...conversationScope}}):Promise.resolve(0),
  db.doniConversation.count({where:{status:'ACTIVE',agentRequired:true,assignedAgentId:null,...conversationScope}}).catch(()=>0),
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id,updatedAt:{lt:staleAt},...conversationScope}}).catch(()=>0):db.doniConversation.count({where:{status:'ACTIVE',updatedAt:{lt:staleAt},...conversationScope}}).catch(()=>0),
  db.payment.count({where:{status:'PENDING',...linkedScope}}).catch(()=>0),
  db.manualPaymentReview.count({where:{status:'PENDING',payment:linkedScope}}).catch(()=>0),
  db.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']},...linkedScope}}).catch(()=>0),
  db.postBookingRequest.count({where:{status:{notIn:['resolved','closed','cancelled']},...requestRefWhere}}).catch(()=>0),
  db.checkinService.count({where:{status:{in:['offered','accepted','payment_pending']},tracking:refWhere}}).catch(()=>0),
  db.baggageService.count({where:{status:{in:['requested','pending','payment_pending']},tracking:refWhere}}).catch(()=>0),
 ]);
 const openIncidents=scope.mode==='global'?await db.flightIncident.count({where:{status:{in:['open','acknowledged']}}}).catch(()=>0):0;
 const dept=user.orgRole==='SUPER_ADMIN'||user.orgRole==='COUNTRY_ADMIN'?'MANAGEMENT':(user.department||'OPERATIONS');
 return {dept,myActiveConversations,myAttentionConversations,unassignedAttention,stalledConversations,pendingPayments,pendingManualReviews,ticketsToIssue,openPostBooking,openIncidents,activeCheckins,activeBaggage};
}
