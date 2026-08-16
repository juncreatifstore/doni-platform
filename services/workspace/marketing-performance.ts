import {listMarketingCampaigns,campaignMetrics} from '@/lib/workspace/marketing-campaigns';
import {listMarketingAttributions} from '@/lib/workspace/marketing-attribution';

export async function getMarketingPerformance(){
 const [campaigns,attributions]=await Promise.all([listMarketingCampaigns(),listMarketingAttributions()]);
 const realizedByCampaign=new Map<string,{sales:number;revenue:number;mismatch:number}>();
 for(const a of attributions){if(!a.campaignId)continue;const c=campaigns.find(x=>x.id===a.campaignId);if(!c)continue;const x=realizedByCampaign.get(c.id)||{sales:0,revenue:0,mismatch:0};if(a.currency===c.currency){x.sales++;x.revenue+=a.amount;}else x.mismatch++;realizedByCampaign.set(c.id,x);}
 const rows=campaigns.map(c=>{const realized=realizedByCampaign.get(c.id)||{sales:0,revenue:0,mismatch:0};const realRoas=c.spend>0?realized.revenue/c.spend:null;const realRoi=c.spend>0?((realized.revenue-c.spend)/c.spend)*100:null;const realCac=realized.sales>0?c.spend/realized.sales:null;return {...c,metrics:campaignMetrics(c),realized:{...realized,roas:realRoas,roi:realRoi,cac:realCac}};}).sort((a,b)=>(b.realized.roas??-1)-(a.realized.roas??-1));
 const currencyTotals=new Map<string,{currency:string;spend:number;revenue:number;sales:number}>();
 for(const c of rows){const x=currencyTotals.get(c.currency)||{currency:c.currency,spend:0,revenue:0,sales:0};x.spend+=c.spend;x.revenue+=c.realized.revenue;x.sales+=c.realized.sales;currencyTotals.set(c.currency,x);}
 const bySource=new Map<string,{source:string;sales:number;revenueByCurrency:Record<string,number>}>();for(const a of attributions){const x=bySource.get(a.source)||{source:a.source,sales:0,revenueByCurrency:{}};x.sales++;x.revenueByCurrency[a.currency]=(x.revenueByCurrency[a.currency]||0)+a.amount;bySource.set(a.source,x);}
 const totals=campaigns.reduce((a,c)=>({budget:a.budget+c.budget,spend:a.spend+c.spend,leads:a.leads+c.leads,sales:a.sales+c.sales,revenue:a.revenue+c.revenue}),{budget:0,spend:0,leads:0,sales:0,revenue:0});const cpl=totals.leads?totals.spend/totals.leads:null,cac=totals.sales?totals.spend/totals.sales:null,roas=totals.spend?totals.revenue/totals.spend:null,roi=totals.spend?((totals.revenue-totals.spend)/totals.spend)*100:null,conversion=totals.leads?(totals.sales/totals.leads)*100:null;
 return {totals:{...totals,cpl,cac,roas,roi,conversion},rows,currencyTotals:[...currencyTotals.values()].map(x=>({...x,roas:x.spend?x.revenue/x.spend:null,roi:x.spend?((x.revenue-x.spend)/x.spend)*100:null})),sources:[...bySource.values()],attributionCount:attributions.length};
}
