import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { sendWhatsAppText } from '@/services/whatsapp/send';
import type { SafeUser } from '@/lib/auth/session';
import { getSegment } from '@/services/segments/registry';
import type { ConversationSession } from '@/services/conversation/types';

export async function listLiveConversations(limit=100){
  const rows=await db.doniConversation.findMany({
    where:{status:{in:['ACTIVE','PAUSED','AGENT_HOLD']}},
    orderBy:[{agentRequired:'desc'},{updatedAt:'desc'}],
    take:Math.min(Math.max(limit,1),200),
    include:{assignedAgent:{select:{id:true,username:true,fullName:true}},_count:{select:{messages:true}}}
  });
  return rows.map(r=>({
    id:r.id,waId:r.waId,country:r.country,status:r.status,currentSegment:r.currentSegment,
    language:r.lockedLanguage||r.language,agentRequired:r.agentRequired,lastMessageAt:r.lastMessageAt,
    updatedAt:r.updatedAt,assignedAgent:r.assignedAgent,messageCount:r._count.messages,
    heldMinutes:r.agentTakenOverAt?Math.floor((Date.now()-r.agentTakenOverAt.getTime())/60000):null
  }));
}

export async function getConversationDetail(id:string){
  const row=await db.doniConversation.findUnique({
    where:{id},
    include:{
      assignedAgent:{select:{id:true,username:true,fullName:true,role:true}},
      messages:{orderBy:{createdAt:'asc'},take:500,include:{senderUser:{select:{username:true,fullName:true}}}},
      payments:{orderBy:{createdAt:'desc'},take:10},
      tickets:{orderBy:{createdAt:'desc'},take:10}
    }
  });
  if(!row)return null;
  return {...row,payments:row.payments.map(p=>({...p,amount:p.amount.toString()}))};
}

export async function recordMessage(input:{conversationId:string;direction:'INBOUND'|'OUTBOUND';senderType:'CUSTOMER'|'BOT'|'AGENT'|'SYSTEM';text?:string|null;contentType?:string;providerMessageId?:string|null;senderUserId?:string|null;metadata?:unknown}){
  if(input.providerMessageId){
    const exists=await db.conversationMessage.findUnique({where:{providerMessageId:input.providerMessageId}}).catch(()=>null);
    if(exists)return exists;
  }
  return db.conversationMessage.create({data:{conversationId:input.conversationId,direction:input.direction,senderType:input.senderType,text:input.text??null,contentType:input.contentType||'text',providerMessageId:input.providerMessageId||null,senderUserId:input.senderUserId||null,metadata:input.metadata as never}});
}

export async function takeoverConversation(id:string,user:SafeUser){
  const current=await db.doniConversation.findUnique({where:{id},select:{id:true,status:true,assignedAgentId:true,waId:true}});
  if(!current)throw new Error('conversation_not_found');
  if(current.status==='AGENT_HOLD'&&current.assignedAgentId&&current.assignedAgentId!==user.id)throw new Error('conversation_already_assigned');
  const row=await db.doniConversation.update({where:{id},data:{status:'AGENT_HOLD',agentRequired:true,assignedAgentId:user.id,agentTakenOverAt:new Date(),agentReleasedAt:null}});
  await recordMessage({conversationId:id,direction:'OUTBOUND',senderType:'SYSTEM',text:`Conversation prise en charge par ${user.fullName||user.username}.`,senderUserId:user.id,metadata:{event:'takeover'}});
  await audit({userId:user.id,action:'conversation.takeover',entity:'DoniConversation',entityId:id,metadata:{waId:current.waId}});
  return row;
}

export async function releaseConversation(id:string,user:SafeUser){
  const current=await db.doniConversation.findUnique({where:{id},select:{id:true,status:true,assignedAgentId:true,waId:true}});
  if(!current)throw new Error('conversation_not_found');
  if(current.assignedAgentId&&current.assignedAgentId!==user.id&&user.role==='AGENT')throw new Error('conversation_assigned_to_other_agent');
  const row=await db.doniConversation.update({where:{id},data:{status:'ACTIVE',agentRequired:false,assignedAgentId:null,agentReleasedAt:new Date()}});
  await recordMessage({conversationId:id,direction:'OUTBOUND',senderType:'SYSTEM',text:`Conversation rendue à DONI par ${user.fullName||user.username}.`,senderUserId:user.id,metadata:{event:'release'}});
  let resumeDelivery:unknown=null;
  const handler=getSegment(row.currentSegment);
  if(handler){
    const session={id:row.id,waId:row.waId,country:row.country,businessSegment:row.businessSegment,lockedLanguage:row.lockedLanguage as any,currentSegment:row.currentSegment,previousSegment:row.previousSegment,state:(row.state||{}) as any,status:'ACTIVE',agentRequired:false,lastMessageAt:row.lastMessageAt,createdAt:row.createdAt,updatedAt:row.updatedAt} as ConversationSession;
    const prompt=await handler.prompt(session);
    if(prompt){resumeDelivery=await sendWhatsAppText(row.waId,prompt);const pid=(resumeDelivery as any)?.response?.messages?.[0]?.id??null;await recordMessage({conversationId:id,direction:'OUTBOUND',senderType:'BOT',text:prompt,providerMessageId:pid,metadata:{event:'resume_prompt',delivery:resumeDelivery}});}
  }
  await audit({userId:user.id,action:'conversation.release',entity:'DoniConversation',entityId:id,metadata:{waId:current.waId,resumePrompt:Boolean(handler)}});
  return {...row,resumeDelivery};
}

export async function sendAgentMessage(id:string,user:SafeUser,text:string){
  const clean=text.trim(); if(!clean)throw new Error('message_required'); if(clean.length>4096)throw new Error('message_too_long');
  const c=await db.doniConversation.findUnique({where:{id},select:{id:true,waId:true,status:true,assignedAgentId:true}});
  if(!c)throw new Error('conversation_not_found');
  if(c.status!=='AGENT_HOLD')throw new Error('takeover_required');
  if(c.assignedAgentId!==user.id&&user.role==='AGENT')throw new Error('conversation_assigned_to_other_agent');
  const delivery=await sendWhatsAppText(c.waId,clean);
  const providerMessageId=(delivery as any)?.response?.messages?.[0]?.id??null;
  const message=await recordMessage({conversationId:id,direction:'OUTBOUND',senderType:'AGENT',text:clean,senderUserId:user.id,providerMessageId,metadata:{delivery}});
  await db.doniConversation.update({where:{id},data:{lastMessageAt:new Date(),agentRequired:true}});
  await audit({userId:user.id,action:'conversation.agent_message',entity:'DoniConversation',entityId:id,metadata:{dryRun:(delivery as any)?.dryRun===true}});
  return {message,delivery};
}
