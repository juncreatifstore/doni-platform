import {listMarketingLeads} from '@/lib/workspace/marketing';
import {listMarketingAttributions} from '@/lib/workspace/marketing-attribution';
import {listMarketingReviews} from '@/lib/workspace/marketing-reviews';
import {listMarketingLoyalty} from '@/lib/workspace/marketing-loyalty';
import {listMarketingReferrals} from '@/lib/workspace/marketing-referrals';

type Money={currency:string;amount:number};
export type MarketingLifecycleRow={
 key:string;name:string;phone?:string|null;email?:string|null;sources:string[];leadStatuses:string[];destinations:string[];
 sales:number;revenueByCurrency:Money[];reviews:number;averageRating:number|null;loyaltyTier?:string|null;loyaltyStatus?:string|null;
 referralsGiven:number;referralsGivenPaid:number;referralsReceived:number;lastActivityAt:string;links:{leads:boolean;loyalty:boolean;reviews:boolean;referrals:boolean};
};
function phone(v?:string|null){const s=String(v||'').replace(/\D/g,'');return s.length>=7?s:null;}
function email(v?:string|null){const s=String(v||'').trim().toLowerCase();return s&&s.includes('@')?s:null;}
function keys(p?:string|null,e?:string|null){const out:string[]=[];const np=phone(p),ne=email(e);if(np)out.push(`p:${np}`);if(ne)out.push(`e:${ne}`);return out;}
function newest(a:string,b?:string|null){if(!b)return a;return new Date(b).getTime()>new Date(a).getTime()?b:a;}
function money(map:Map<string,number>){return [...map.entries()].map(([currency,amount])=>({currency,amount})).sort((a,b)=>a.currency.localeCompare(b.currency));}
export async function getMarketingLifecycleWorkspace(){
 const [leads,attributions,reviews,loyalty,referrals]=await Promise.all([listMarketingLeads(),listMarketingAttributions(),listMarketingReviews(),listMarketingLoyalty(),listMarketingReferrals()]);
 const alias=new Map<string,string>();
 const rows=new Map<string,any>();
 function resolve(candidateKeys:string[],fallback:string){for(const k of candidateKeys){const found=alias.get(k);if(found)return found;}const key=candidateKeys[0]||fallback;for(const k of candidateKeys)alias.set(k,key);return key;}
 function ensure(key:string,name:string,p?:string|null,e?:string|null,at?:string){let r=rows.get(key);if(!r){r={key,name,phone:p||null,email:e||null,sources:new Set<string>(),leadStatuses:new Set<string>(),destinations:new Set<string>(),sales:0,revenue:new Map<string,number>(),reviews:0,ratingTotal:0,loyaltyTier:null,loyaltyStatus:null,referralsGiven:0,referralsGivenPaid:0,referralsReceived:0,lastActivityAt:at||new Date(0).toISOString(),links:{leads:false,loyalty:false,reviews:false,referrals:false}};rows.set(key,r);}else{if(!r.phone&&p)r.phone=p;if(!r.email&&e)r.email=e;if((!r.name||r.name==='Client')&&name)r.name=name;if(at)r.lastActivityAt=newest(r.lastActivityAt,at);}return r;}
 const leadKey=new Map<string,string>();
 for(const lead of leads){const ks=keys(lead.phone,lead.email);const key=resolve(ks,`lead:${lead.id}`);for(const k of ks)alias.set(k,key);const r=ensure(key,lead.name,lead.phone,lead.email,lead.updatedAt);r.links.leads=true;r.sources.add(lead.source);r.leadStatuses.add(lead.status);if(lead.destination)r.destinations.add(lead.destination);leadKey.set(lead.id,key);}
 const paymentToKey=new Map<string,string>();
 for(const sale of attributions){const key=leadKey.get(sale.leadId)||`lead:${sale.leadId}`;const r=ensure(key,sale.leadName,null,null,sale.attributedAt);r.sales++;r.sources.add(sale.source);r.revenue.set(sale.currency,(r.revenue.get(sale.currency)||0)+sale.amount);paymentToKey.set(sale.paymentReference.trim().toUpperCase(),key);}
 for(const item of loyalty){const ks=keys(item.phone,item.email);const key=resolve(ks,`loyalty:${item.id}`);for(const k of ks)alias.set(k,key);const r=ensure(key,item.customerName,item.phone,item.email,item.updatedAt);r.links.loyalty=true;r.loyaltyTier=item.tier;r.loyaltyStatus=item.status;for(const d of item.preferredDestinations||[])r.destinations.add(d);}
 for(const ref of referrals){const referrerKeys=keys(ref.referrerPhone,null);const rk=resolve(referrerKeys,`referrer:${ref.id}`);for(const k of referrerKeys)alias.set(k,rk);const rr=ensure(rk,ref.referrerName,ref.referrerPhone,null,ref.updatedAt);rr.links.referrals=true;rr.referralsGiven++;if(['PAID','REWARDED'].includes(ref.status))rr.referralsGivenPaid++;
  const referredKeys=keys(ref.referredPhone,null);const dk=resolve(referredKeys,`referred:${ref.id}`);for(const k of referredKeys)alias.set(k,dk);const dr=ensure(dk,ref.referredName,ref.referredPhone,null,ref.updatedAt);dr.links.referrals=true;dr.referralsReceived++;if(ref.destination)dr.destinations.add(ref.destination);
 }
 let unmatchedReviews=0;
 for(const review of reviews){const ref=review.bookingReference?.trim().toUpperCase();const key=ref?paymentToKey.get(ref):undefined;if(!key){unmatchedReviews++;continue;}const r=ensure(key,review.customerName,null,null,review.updatedAt);r.links.reviews=true;r.reviews++;r.ratingTotal+=review.rating;if(review.destination)r.destinations.add(review.destination);}
 const items:MarketingLifecycleRow[]=[...rows.values()].map(r=>({key:r.key,name:r.name,phone:r.phone,email:r.email,sources:[...r.sources],leadStatuses:[...r.leadStatuses],destinations:[...r.destinations],sales:r.sales,revenueByCurrency:money(r.revenue),reviews:r.reviews,averageRating:r.reviews?Math.round((r.ratingTotal/r.reviews)*10)/10:null,loyaltyTier:r.loyaltyTier,loyaltyStatus:r.loyaltyStatus,referralsGiven:r.referralsGiven,referralsGivenPaid:r.referralsGivenPaid,referralsReceived:r.referralsReceived,lastActivityAt:r.lastActivityAt,links:r.links})).sort((a,b)=>new Date(b.lastActivityAt).getTime()-new Date(a.lastActivityAt).getTime());
 return {items,summary:{profiles:items.length,withSales:items.filter(x=>x.sales>0).length,withLoyalty:items.filter(x=>x.links.loyalty).length,ambassadors:items.filter(x=>x.referralsGiven>0).length,unmatchedReviews}};
}
