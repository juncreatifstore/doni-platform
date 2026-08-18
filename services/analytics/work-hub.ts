import {db} from '@/lib/db';
import type {Department} from '@/lib/auth/departments';

type WorkHubUser={id:string;role:string;department?:Department|null};
const STALE_MS=15*60*1000;

export async function getWorkHubMetrics(user:WorkHubUser){
 const staleAt=new Date(Date.now()-STALE_MS);
 const assignedWhere=user.role==='AGENT'?{assignedAgentId:user.id}:{status:'__never__'} as any;
 const [myActiveConversations,myAttentionConversations,unassignedAttention,stalledConversations,pendingPayments,pendingManualReviews,ticketsToIssue,openPostBooking,openIncidents,activeCheckins,activeBaggage]=await Promise.all([
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id}}):Promise.resolve(0),
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id,agentRequired:true}}):Promise.resolve(0),
  db.doniConversation.count({where:{status:'ACTIVE',agentRequired:true,assignedAgentId:null}}).catch(()=>0),
  user.role==='AGENT'?db.doniConversation.count({where:{status:'ACTIVE',assignedAgentId:user.id,updatedAt:{lt:staleAt}}}).catch(()=>0):db.doniConversation.count({where:{status:'ACTIVE',updatedAt:{lt:staleAt}}}).catch(()=>0),
  db.payment.count({where:{status:'PENDING'}}).catch(()=>0),
  db.manualPaymentReview.count({where:{status:'PENDING'}}).catch(()=>0),
  db.ticket.count({where:{status:{in:['PENDING_MANUAL_ISSUE','ISSUING']}}}).catch(()=>0),
  db.postBookingRequest.count({where:{status:{notIn:['resolved','closed','cancelled']}}}).catch(()=>0),
  db.flightIncident.count({where:{status:{in:['open','acknowledged']}}}).catch(()=>0),
  db.checkinService.count({where:{status:{in:['offered','accepted','payment_pending']}}}).catch(()=>0),
  db.baggageService.count({where:{status:{in:['requested','pending','payment_pending']}}}).catch(()=>0),
 ]);
 const dept=user.role==='AGENT'?(user.department||'OPERATIONS'):'MANAGEMENT';
 return {dept,myActiveConversations,myAttentionConversations,unassignedAttention,stalledConversations,pendingPayments,pendingManualReviews,ticketsToIssue,openPostBooking,openIncidents,activeCheckins,activeBaggage};
}
