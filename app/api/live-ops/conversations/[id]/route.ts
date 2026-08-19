import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/session';
import { getConversationDetail } from '@/services/live-ops/service';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const {id}=await params;try{const row=await getConversationDetail(id,auth.user);if(!row)return NextResponse.json({success:false,error:'not_found'},{status:404});return NextResponse.json({success:true,conversation:row});}catch(e){const m=e instanceof Error?e.message:'detail_failed';return NextResponse.json({success:false,error:m},{status:m==='forbidden_department'?403:m==='conversation_not_found'?404:500});}}
