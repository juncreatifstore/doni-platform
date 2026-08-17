import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {createMarketingWeeklyReview,listMarketingWeeklyReviews} from '@/lib/workspace/marketing-weekly-reviews';
export async function GET(){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});return NextResponse.json({success:true,items:await listMarketingWeeklyReviews()});}
export async function POST(req:Request){const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});try{const b=await req.json();const item=await createMarketingWeeklyReview({...b,createdById:auth.user.id,createdByName:auth.user.fullName||auth.user.username});return NextResponse.json({success:true,item});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'create_failed'},{status:400});}}
