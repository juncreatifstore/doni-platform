import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {consumeMfaChallenge} from '@/lib/auth/mfa';
import {createPortalSession} from '@/lib/auth/session';
import {audit} from '@/lib/audit';

export async function POST(req:Request){try{const body=await req.json();const challenge=String(body?.challenge||'');const code=String(body?.code||'');if(!challenge||!code)return NextResponse.json({success:false,error:'mfa_required'},{status:400});const verified=await consumeMfaChallenge(challenge,code);const user=await db.portalUser.findUnique({where:{id:verified.userId}});if(!user||!user.active)return NextResponse.json({success:false,error:'invalid_user'},{status:401});await createPortalSession(user.id);await db.portalUser.update({where:{id:user.id},data:{lastLoginAt:new Date()}});await audit({userId:user.id,action:'AUTH_LOGIN_MFA',entity:'PortalUser',entityId:user.id,metadata:{method:verified.method}});return NextResponse.json({success:true,role:user.role});}catch(e){const error=e instanceof Error?e.message:'mfa_failed';const status=['invalid_mfa_code','invalid_mfa_challenge'].includes(error)?401:error==='mfa_challenge_locked'?429:400;return NextResponse.json({success:false,error},{status});}}
