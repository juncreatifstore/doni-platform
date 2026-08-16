import {NextRequest,NextResponse} from 'next/server';
import {runWorkspaceAutomation} from '@/services/workspace/automation';
import {runInternalNotificationAutomation} from '@/services/workspace/notification-automation';
import {runCaseReminderAutomation} from '@/services/workspace/case-reminder-automation';

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({success:false,error:'unauthorized'},{status:401});
 try{
  const workspace=await runWorkspaceAutomation();
  const notifications=await runInternalNotificationAutomation();
  const caseReminders=await runCaseReminderAutomation();
  return NextResponse.json({success:true,workspace,notifications,caseReminders});
 }
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'workspace_automation_failed'},{status:500});}
}
