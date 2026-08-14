import { NextResponse } from 'next/server';
import { destroyPortalSession, getCurrentUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
export async function POST(){const user=await getCurrentUser(); await destroyPortalSession(); if(user)await audit({userId:user.id,action:'AUTH_LOGOUT',entity:'PortalUser',entityId:user.id}); return NextResponse.json({success:true});}
