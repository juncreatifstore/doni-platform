import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {dataScopeForUser,canAccessDepartments,countryWhere} from '@/lib/auth/data-scope';
import {db} from '@/lib/db';

const CUSTOMER_DEPARTMENTS=['RESERVATIONS','CUSTOMER_SERVICE','TICKETING','FLIGHT_OPS','FINANCE','OPERATIONS','MANAGEMENT'] as const;

export async function GET(req:Request){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!canAccessDepartments(auth.user,CUSTOMER_DEPARTMENTS))return NextResponse.json({success:false,error:'forbidden_department'},{status:403});
 const scope=dataScopeForUser(auth.user);
 if(scope.mode==='none')return NextResponse.json({success:true,customers:[]});
 const u=new URL(req.url);
 const q=(u.searchParams.get('q')||'').trim();
 const search=q?{OR:[{phone:{contains:q}},{customerCode:{contains:q,mode:'insensitive'}},{displayName:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]}:{};
 const where:any={...countryWhere(scope),...search};
 const rows=await (db as any).customerProfile.findMany({where,orderBy:{lastSeenAt:'desc'},take:100,include:{_count:{select:{conversations:true}}}});
 return NextResponse.json({success:true,customers:rows});
}
