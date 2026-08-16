import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {markInternalNotificationRead} from '@/lib/workspace/notifications';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const {id}=await params;const b=await req.json().catch(()=>({}));const notification=await markInternalNotificationRead(id,auth.user.id,b.read!==false);return NextResponse.json({success:true,notification});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'notification_update_failed'},{status:400});}}
