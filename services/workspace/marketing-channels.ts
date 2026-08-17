import {db} from '@/lib/db';
import {listMarketingLeads,MARKETING_SOURCES} from '@/lib/workspace/marketing';
import {listMarketingAttributions} from '@/lib/workspace/marketing-attribution';

const DAY=24*60*60*1000;
export const RESPONSE_TARGET_MINUTES=60;

type Msg={conversationId:string;direction:string;senderType:string;createdAt:Date};
type ResponseStats={samples:number;averageMinutes:number|null;medianMinutes:number|null;p90Minutes:number|null;withinTarget:number;withinTargetPct:number|null;openEpisodes:number};

function percentile(values:number[],p:number){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const i=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));return sorted[i];}
function stats(values:number[],openEpisodes:number):ResponseStats{const avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;const within=values.filter(v=>v<=RESPONSE_TARGET_MINUTES).length;return {samples:values.length,averageMinutes:avg===null?null:Math.round(avg*10)/10,medianMinutes:percentile(values,.5),p90Minutes:percentile(values,.9),withinTarget:within,withinTargetPct:values.length?Math.round(within/values.length*1000)/10:null,openEpisodes};}

function responseEpisodes(messages:Msg[],acceptedSenderTypes:string[]){
 const byConversation=new Map<string,Msg[]>();
 for(const m of messages){const arr=byConversation.get(m.conversationId)||[];arr.push(m);byConversation.set(m.conversationId,arr);}
 const durations:number[]=[];let open=0;
 for(const arr of byConversation.values()){
  arr.sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime());
  let pendingStart:Date|null=null;
  for(const m of arr){
   if(m.direction==='INBOUND'&&m.senderType==='CUSTOMER'){if(!pendingStart)pendingStart=m.createdAt;continue;}
   if(pendingStart&&m.direction==='OUTBOUND'&&acceptedSenderTypes.includes(m.senderType)){
    durations.push(Math.max(0,(m.createdAt.getTime()-pendingStart.getTime())/60000));pendingStart=null;
   }
  }
  if(pendingStart)open++;
 }
 return stats(durations,open);
}

export async function getMarketingChannelPerformance(days=30){
 const from=new Date(Date.now()-Math.max(1,Math.min(days,365))*DAY);
 const [leads,attributions,messages]=await Promise.all([
  listMarketingLeads(),
  listMarketingAttributions(),
  db.conversationMessage.findMany({where:{createdAt:{gte:from}},orderBy:{createdAt:'asc'},select:{conversationId:true,direction:true,senderType:true,createdAt:true}})
 ]);
 const recentLeads=leads.filter(x=>new Date(x.createdAt)>=from);
 const recentAttributions=attributions.filter(x=>new Date(x.attributedAt)>=from);
 const rows=MARKETING_SOURCES.map(source=>{
  const sourceLeads=recentLeads.filter(x=>x.source===source);
  const qualified=sourceLeads.filter(x=>['QUALIFIED','HOT','QUOTE_SENT','FOLLOW_UP','CONVERTED'].includes(x.status)).length;
  const convertedLeads=sourceLeads.filter(x=>x.status==='CONVERTED').length;
  const sales=recentAttributions.filter(x=>x.source===source);
  const revenue=new Map<string,number>();for(const s of sales)revenue.set(s.currency,(revenue.get(s.currency)||0)+s.amount);
  return {source,leads:sourceLeads.length,qualified,convertedLeads,attributedSales:sales.length,leadToSalePct:sourceLeads.length?Math.round(sales.length/sourceLeads.length*1000)/10:null,revenueByCurrency:[...revenue.entries()].map(([currency,amount])=>({currency,amount}))};
 }).sort((a,b)=>b.attributedSales-a.attributedSales||b.leads-a.leads);
 const whatsappMessages=messages.filter(m=>m.senderType==='CUSTOMER'||m.senderType==='BOT'||m.senderType==='AGENT');
 return {periodDays:days,targetMinutes:RESPONSE_TARGET_MINUTES,channels:rows,whatsapp:{firstDoniResponse:responseEpisodes(whatsappMessages,['BOT','AGENT']),humanResponse:responseEpisodes(whatsappMessages,['AGENT'])},generatedAt:new Date().toISOString()};
}
