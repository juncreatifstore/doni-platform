import {NextRequest,NextResponse} from 'next/server';
import {runMarketingPublisherWorker} from '@/services/workspace/marketing-publisher-worker';

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({success:false,error:'unauthorized'},{status:401});
 try{const publisher=await runMarketingPublisherWorker();return NextResponse.json({success:true,publisher});}
 catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'marketing_publisher_failed'},{status:500});}
}
