import {NextResponse} from 'next/server';import {requireApiUser} from '@/lib/auth/session';import {listManualPaymentReviews} from '@/services/payments/manual-review';
export async function GET(){const a=await requireApiUser('AGENT');if(!a.ok)return NextResponse.json({success:false,error:a.error},{status:a.status});return NextResponse.json({success:true,rows:await listManualPaymentReviews()});}
