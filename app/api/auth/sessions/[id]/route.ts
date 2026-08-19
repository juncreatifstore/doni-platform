import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {revokeUserSession} from '@/lib/auth/session-security';
import {requireSameOrigin} from '@/lib/auth/origin';
import {audit} from '@/lib/audit';

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){const origin=requireSameOrigin(req);if(!origin.ok)return NextResponse.json({success:false,error:origin.error},{status:origin.status});const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const {id}=await params;await revokeUserSession(auth.user.id,id);await audit({userId:auth.user.id,action:'AUTH_REVOKE_SESSION',entity:'PortalSession',entityId:id});return NextResponse.json({success:true});}catch(e){const error=e instanceof Error?e.message:'session_revoke_failed';const status=error==='session_not_found'?404:error==='cannot_revoke_current_session_here'?400:400;return NextResponse.json({success:false,error},{status});}}
