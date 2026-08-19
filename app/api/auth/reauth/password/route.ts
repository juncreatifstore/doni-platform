import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireApiUser} from '@/lib/auth/session';
import {verifyPassword} from '@/lib/auth/password';
import {markCurrentSessionPasswordReauth} from '@/lib/auth/session-security';

export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});const body=await req.json().catch(()=>({}));const password=String(body?.password||'');if(!password)return NextResponse.json({success:false,error:'password_required'},{status:400});const user=await db.portalUser.findUnique({where:{id:auth.user.id},select:{passwordHash:true,active:true}});if(!user?.active||!verifyPassword(password,user.passwordHash))return NextResponse.json({success:false,error:'invalid_password'},{status:401});const verifiedAt=await markCurrentSessionPasswordReauth();return NextResponse.json({success:true,verifiedAt,validForSeconds:300});}
