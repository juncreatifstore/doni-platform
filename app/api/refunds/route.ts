import {NextRequest,NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {createRefund,listRefunds} from '@/services/post-booking/refunds';
import {canAccessDepartments} from '@/lib/auth/data-scope';
import {refundIdsForUser,refundInputAllowed} from '@/lib/auth/refund-access';
import {requireRecentStepUp} from '@/lib/auth/session-security';

export async function GET(){
 const a=await requireApiUser('AGENT');if(!a.ok)return NextResponse.json({success:false,error:a.error},{status:a.status});
 if(!canAccessDepartments(a.user,['FINANCE']))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const rows:any[]=await listRefunds();const allowed=await refundIdsForUser(a.user);const scoped=allowed===null?rows:rows.filter(r=>allowed.includes(String(r.id)));
 return NextResponse.json({success:true,rows:scoped});
}

export async function POST(req:NextRequest){
 const a=await requireApiUser('AGENT');if(!a.ok)return NextResponse.json({success:false,error:a.error},{status:a.status});
 if(!canAccessDepartments(a.user,['FINANCE']))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const step=await requireRecentStepUp();if(!step.ok)return NextResponse.json({success:false,error:step.error,windowSeconds:step.windowSeconds},{status:step.status});
 try{const body=await req.json();if(!(await refundInputAllowed(a.user,body)))return NextResponse.json({success:false,error:'forbidden_target'},{status:403});return NextResponse.json({success:true,row:await createRefund(body,a.user)});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'create_failed'},{status:400});}
}
