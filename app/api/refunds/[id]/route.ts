import {NextRequest,NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {actOnRefund} from '@/services/post-booking/refunds';
import {canAccessDepartments} from '@/lib/auth/data-scope';
import {refundAllowed} from '@/lib/auth/refund-access';
import {requireRecentStepUp} from '@/lib/auth/session-security';

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const a=await requireApiUser('AGENT');if(!a.ok)return NextResponse.json({success:false,error:a.error},{status:a.status});
 if(!canAccessDepartments(a.user,['FINANCE']))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const step=await requireRecentStepUp();if(!step.ok)return NextResponse.json({success:false,error:step.error,windowSeconds:step.windowSeconds},{status:step.status});
 try{const {id}=await params;if(!(await refundAllowed(a.user,id)))return NextResponse.json({success:false,error:'forbidden_target'},{status:403});const b=await req.json();return NextResponse.json({success:true,row:await actOnRefund(id,String(b.action||''),b,a.user)});}catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'refund_action_failed'},{status:400});}
}
