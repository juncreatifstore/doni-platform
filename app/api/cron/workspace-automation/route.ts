import {NextRequest,NextResponse} from 'next/server';
import {runWorkspaceAutomation} from '@/services/workspace/automation';

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({success:false,error:'unauthorized'},{status:401});
 try{return NextResponse.json({success:true,...await runWorkspaceAutomation()});}
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'workspace_automation_failed'},{status:500});}
}
