import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
export async function GET(){const user=await getCurrentUser();return user?NextResponse.json({success:true,user}):NextResponse.json({success:false,error:'unauthenticated'},{status:401});}
