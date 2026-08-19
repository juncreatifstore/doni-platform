import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/session';
import { listLiveConversations } from '@/services/live-ops/service';
export async function GET(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const u=new URL(req.url);const limit=Number(u.searchParams.get('limit')||100);try{return NextResponse.json({success:true,conversations:await listLiveConversations(limit,auth.user)});}catch(e){const m=e instanceof Error?e.message:'list_failed';return NextResponse.json({success:false,error:m},{status:m==='forbidden_department'?403:500});}}
