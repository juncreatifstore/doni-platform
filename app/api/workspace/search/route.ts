import {NextRequest,NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {globalWorkspaceSearch} from '@/services/workspace/global-search';

export async function GET(req:NextRequest){
 const auth=await requireApiUser('AGENT');
 if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 const q=req.nextUrl.searchParams.get('q')||'';
 if(q.trim().length<2)return NextResponse.json({success:true,results:[]});
 try{return NextResponse.json({success:true,results:await globalWorkspaceSearch(q,auth.user)});}
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'search_failed'},{status:500});}
}
