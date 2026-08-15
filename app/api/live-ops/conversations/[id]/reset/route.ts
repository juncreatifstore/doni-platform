import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await requireApiUser('SUPER_ADMIN');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  const {id}=await params;
  const existing=await db.doniConversation.findUnique({where:{id},select:{id:true,waId:true,currentSegment:true,status:true}});
  if(!existing)return NextResponse.json({success:false,error:'conversation_not_found'},{status:404});
  const resetAt=new Date();
  const conversation=await db.doniConversation.update({
    where:{id},
    data:{
      previousSegment:existing.currentSegment,
      currentSegment:'segment_language',
      businessSegment:'flights',
      lockedLanguage:null,
      state:{phase23_reset_at:resetAt.toISOString()},
      status:'ACTIVE',
      agentRequired:false,
      assignedAgentId:null,
      agentTakenOverAt:null,
      agentReleasedAt:resetAt,
      lastMessageAt:resetAt
    }
  });
  await audit({userId:auth.user.id,action:'conversation.reset',entity:'DoniConversation',entityId:id,metadata:{waId:existing.waId,fromSegment:existing.currentSegment,reason:'controlled_test'}});
  return NextResponse.json({success:true,conversation:{id:conversation.id,waId:conversation.waId,currentSegment:conversation.currentSegment,status:conversation.status},resetAt:resetAt.toISOString()});
}
