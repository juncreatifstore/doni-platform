import {MARKETING_GOALS,getMarketingPhase1Dashboard} from '@/services/workspace/marketing-phase1';
import {listMarketingContent} from '@/lib/workspace/marketing';
import {listMarketingReviews} from '@/lib/workspace/marketing-reviews';
import {listMarketingPartnerships} from '@/lib/workspace/marketing-partnerships';
import {getMarketingPerformance} from '@/services/workspace/marketing-performance';

const DAY=86400000;
function sinceDays(n:number){return Date.now()-n*DAY;}
function startOfMonth(){const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return d.getTime();}
function ts(v?:string|null){return v?new Date(v).getTime():0;}
function pct(value:number,target:number){return target>0?Math.min(100,Math.round(value/target*100)):0;}

export async function getMarketingScorecard(){
 const [base,content,reviews,partnerships,performance]=await Promise.all([
  getMarketingPhase1Dashboard(),listMarketingContent(),listMarketingReviews(),listMarketingPartnerships(),getMarketingPerformance()
 ]);
 const week=sinceDays(7),month=startOfMonth();
 const weekVideos=content.filter(x=>x.status==='PUBLISHED'&&ts(x.updatedAt)>=week&&['REEL','TIKTOK'].includes(String(x.format).toUpperCase())).length;
 const weekReviews=reviews.filter(x=>ts(x.receivedAt)>=week).length;
 const monthPartnerships=partnerships.filter(x=>['SIGNED','ACTIVE'].includes(x.status)&&ts(x.updatedAt)>=month).length;
 const realCurrencyPerformance=performance.currencyTotals.map(x=>({
  currency:x.currency,spend:x.spend,revenue:x.revenue,sales:x.sales,roas:x.roas,roi:x.roi,
  targetMet:x.roas!==null&&x.roas>=MARKETING_GOALS.monthly.roiTarget
 }));
 const goalRows={
  daily:[
   {key:'daily-leads',label:'Nouveaux prospects',value:base.metrics.dayLeads,target:MARKETING_GOALS.daily.leadsMin,progress:pct(base.metrics.dayLeads,MARKETING_GOALS.daily.leadsMin)},
   {key:'daily-published',label:'Contenus publiés',value:base.metrics.dayPublished,target:MARKETING_GOALS.daily.publicationsMin,progress:pct(base.metrics.dayPublished,MARKETING_GOALS.daily.publicationsMin)},
  ],
  weekly:[
   {key:'weekly-leads',label:'Prospects qualifiés / entrants',value:base.metrics.weekLeads,target:MARKETING_GOALS.weekly.leadsMin,progress:pct(base.metrics.weekLeads,MARKETING_GOALS.weekly.leadsMin)},
   {key:'weekly-published',label:'Publications',value:base.metrics.weekPublished,target:MARKETING_GOALS.weekly.publicationsMin,progress:pct(base.metrics.weekPublished,MARKETING_GOALS.weekly.publicationsMin)},
   {key:'weekly-videos',label:'Vidéos / Reels / TikTok',value:weekVideos,target:MARKETING_GOALS.weekly.videos,progress:pct(weekVideos,MARKETING_GOALS.weekly.videos)},
   {key:'weekly-sales',label:'Ventes / conversions',value:base.metrics.weekSales,target:MARKETING_GOALS.weekly.salesMin,progress:pct(base.metrics.weekSales,MARKETING_GOALS.weekly.salesMin)},
   {key:'weekly-reviews',label:'Avis clients',value:weekReviews,target:MARKETING_GOALS.weekly.reviews,progress:pct(weekReviews,MARKETING_GOALS.weekly.reviews)},
  ],
  monthly:[
   {key:'monthly-leads',label:'Prospects',value:base.metrics.monthLeads,target:MARKETING_GOALS.monthly.leadsMin,progress:pct(base.metrics.monthLeads,MARKETING_GOALS.monthly.leadsMin)},
   {key:'monthly-sales',label:'Ventes / conversions',value:base.metrics.monthSales,target:MARKETING_GOALS.monthly.salesMin,progress:pct(base.metrics.monthSales,MARKETING_GOALS.monthly.salesMin)},
   {key:'monthly-partnerships',label:'Partenariats signés / actifs',value:monthPartnerships,target:MARKETING_GOALS.monthly.partnerships,progress:pct(monthPartnerships,MARKETING_GOALS.monthly.partnerships)},
  ]
 };
 const all=[...goalRows.daily,...goalRows.weekly,...goalRows.monthly];
 const met=all.filter(x=>x.progress>=100).length;
 return {goals:MARKETING_GOALS,goalRows,summary:{tracked:all.length,met,atRisk:all.length-met,completion:all.length?Math.round(all.reduce((a,x)=>a+x.progress,0)/all.length):0},manual:{responseMinutes:MARKETING_GOALS.daily.responseMinutes},realCurrencyPerformance,sourcePerformance:performance.sources.slice(0,8)};
}
