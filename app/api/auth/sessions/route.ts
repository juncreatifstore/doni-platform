import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {listUserSessions,revokeOtherSessions} from '@/lib/auth/session-security';
import {requireSameOrigin} from '@/lib/auth/origin';
import {audit} from '@/lib/audit';

export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const sessions=await listUserSessions(auth.user.id);return NextResponse.json({success:true,sessions});}

export async function DELETE(req:Request){const origin=requireSameOrigin(req);if(!origin.ok)return NextResponse.json({success:false,error:origin.error},{status:origin.status});const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const count=await revokeOtherSessions(auth.user.id);await audit({userId:auth.user.id,action:'AUTH_REVOKE_OTHER_SESSIONS',entity:'PortalSession',metadata:{count}});return NextResponse.json({success:true,count});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'session_revoke_failed'},{status:400});}}
