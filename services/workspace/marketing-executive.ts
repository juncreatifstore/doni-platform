import {listMarketingLeads,listMarketingContent} from '@/lib/workspace/marketing';
import {listMarketingCampaigns,campaignMetrics} from '@/lib/workspace/marketing-campaigns';
import {listMarketingPartnerships} from '@/lib/workspace/marketing-partnerships';
import {listMarketingStudio} from '@/lib/workspace/marketing-studio';
import {listMarketingAttributions} from '@/lib/workspace/marketing-attribution';
import {listMarketingPlans} from '@/lib/workspace/marketing-planning';

function sameDay(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function recent(iso:string,days:number){return new Date(iso).getTime()>=Date.now()-days*86400000;}
export async function getMarketingExecutiveCockpit(){
 const [leads,content,campaigns,partnerships,studio,attributions,plans]=await Promise.all([listMarketingLeads(),listMarketingContent(),listMarketingCampaigns(),listMarketingPartnerships(),listMarketingStudio(),listMarketingAttributions(),listMarketingPlans()]);
 const now=new Date();
 const leadsToday=leads.filter(x=>sameDay(new Date(x.createdAt),now)).length;
 const leads7=leads.filter(x=>recent(x.createdAt,7)).length;
 const hotLeads=leads.filter(x=>x.status==='HOT'||x.status==='QUOTE_SENT'||x.status==='FOLLOW_UP').length;
 const converted=leads.filter(x=>x.status==='CONVERTED').length;
 const conversion=leads.length?Math.round(converted/leads.length*1000)/10:0;
 const activeCampaigns=campaigns.filter(x=>x.status==='ACTIVE').length;
 const campaignsAtRisk=campaigns.filter(x=>x.status==='ACTIVE'&&!recent(x.updatedAt,7)).length;
 const contentUpcoming=content.filter(x=>x.scheduledAt&&new Date(x.scheduledAt).getTime()>=Date.now()&&x.status!=='PUBLISHED').length;
 const studioReview=studio.filter(x=>x.status==='REVIEW'||x.status==='CHANGES_REQUESTED').length;
 const activePartnerships=partnerships.filter(x=>x.status==='ACTIVE'||x.status==='SIGNED').length;
 const overduePartnerships=partnerships.filter(x=>x.nextActionAt&&new Date(x.nextActionAt).getTime()<Date.now()&&!['ACTIVE','SIGNED','LOST'].includes(x.status)).length;
 const activePlans=plans.filter(x=>x.status==='ACTIVE'||x.status==='REVIEW').sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
 const revenueByCurrency=new Map<string,{currency:string;revenue:number;sales:number}>();
 for(const a of attributions){const x=revenueByCurrency.get(a.currency)||{currency:a.currency,revenue:0,sales:0};x.revenue+=a.amount;x.sales+=1;revenueByCurrency.set(a.currency,x);}
 const campaignRows=campaigns.map(c=>({...c,metrics:campaignMetrics(c)})).sort((a,b)=>(b.metrics.roas??-1)-(a.metrics.roas??-1)).slice(0,6);
 const sourceMap=new Map<string,number>();for(const a of attributions)sourceMap.set(a.source,(sourceMap.get(a.source)||0)+1);
 const sources=[...sourceMap.entries()].map(([source,sales])=>({source,sales})).sort((a,b)=>b.sales-a.sales);
 return {summary:{leadsToday,leads7,hotLeads,conversion,activeCampaigns,campaignsAtRisk,contentUpcoming,studioReview,activePartnerships,overduePartnerships,attributedSales:attributions.length},revenueByCurrency:[...revenueByCurrency.values()],campaignRows,sources,plans:activePlans.slice(0,6)};
}
