import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {canAccessDepartments,dataScopeForUser} from '@/lib/auth/data-scope';
import {getFinanceMetrics} from '@/services/analytics/dashboard';

export async function GET(){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!canAccessDepartments(auth.user,['FINANCE','MANAGEMENT']))return NextResponse.json({success:false,error:'forbidden_department'},{status:403});
 const scope=dataScopeForUser(auth.user);
 if(scope.mode==='none')return NextResponse.json({success:false,error:'forbidden_scope'},{status:403});
 try{return NextResponse.json({success:true,data:await getFinanceMetrics(scope)});}
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'finance_failed'},{status:500});}
}
