import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {repriceOffer} from '@/services/flights/repricing';
import type {FlightOffer} from '@/services/flights/types';

const CATEGORY='Marketing Live Offers',PREFIX='marketing.live-offer.';
const CAMPAIGN_CATEGORY='Marketing Live Offer Campaign Drafts';
const MAX_AGE_MS=24*60*60*1000;

type VerifiedOffer={
 id:string;conversationId:string;customerId:string|null;waId:string;provider:string;offerId:string;origin:string;destination:string;departDate:string|null;returnDate:string|null;oldPrice:number;price:number;currency:string;status:'VERIFIED'|'CHANGED'|'UNAVAILABLE'|'EXPIRED'|'UNSUPPORTED';verifiedAt:string;expiresAt:string|null;secondsRemaining:number|null;reason?:string|null;offer:FlightOffer|null;
};

function asOffer(v:unknown):FlightOffer|null{if(!v||typeof v!=='object')return null;const x=v as FlightOffer;return x.offer_id&&x.provider&&Number.isFinite(Number(x.price_total))?x:null;}
function segmentEndpoints(o:FlightOffer){const s=o.segments||[];return {origin:s[0]?.origin||'—',destination:s[s.length-1]?.destination||'—'};}
function expiryStatus(expiresAt:string|null|undefined){if(!expiresAt)return {expired:false,seconds:null};const ms=new Date(expiresAt).getTime()-Date.now();return {expired:ms<=0,seconds:Math.max(0,Math.floor(ms/1000))};}

export async function verifyConversationOffer(conversationId:string):Promise<VerifiedOffer|null>{
 const c=await db.doniConversation.findUnique({where:{id:conversationId},select:{id:true,customerId:true,waId:true,state:true,updatedAt:true}});if(!c)return null;
 const state=(c.state||{}) as any;const selected=asOffer(state.selected_offer);if(!selected)return null;
 const endpoints=segmentEndpoints(selected);const base={id:randomUUID(),conversationId:c.id,customerId:c.customerId,waId:c.waId,provider:selected.provider,offerId:selected.offer_id,origin:endpoints.origin,destination:endpoints.destination,departDate:state.depart_date??state.flight_criteria?.depart_date??null,returnDate:state.return_date??state.flight_criteria?.return_date??null,oldPrice:Number(selected.price_total),verifiedAt:new Date().toISOString()};
 const beforeExpiry=expiryStatus(selected.expires_at);
 if(beforeExpiry.expired)return {...base,price:Number(selected.price_total),currency:selected.currency,status:'EXPIRED',expiresAt:selected.expires_at||null,secondsRemaining:0,reason:'offer_expired',offer:selected};
 if(selected.provider!=='duffel')return {...base,price:Number(selected.price_total),currency:selected.currency,status:'UNSUPPORTED',expiresAt:selected.expires_at||null,secondsRemaining:beforeExpiry.seconds,reason:`live_repricing_not_available:${selected.provider}`,offer:selected};
 const r=await repriceOffer(selected);
 if(!r.ok)return {...base,price:Number(selected.price_total),currency:selected.currency,status:'UNAVAILABLE',expiresAt:selected.expires_at||null,secondsRemaining:beforeExpiry.seconds,reason:r.reason||'offer_unavailable',offer:null};
 const e=expiryStatus(r.newOffer.expires_at);if(e.expired)return {...base,price:r.newPrice,currency:r.currency,status:'EXPIRED',expiresAt:r.newOffer.expires_at||null,secondsRemaining:0,reason:'offer_expired_after_reprice',offer:r.newOffer};
 return {...base,price:r.newPrice,currency:r.currency,status:r.changed?'CHANGED':'VERIFIED',expiresAt:r.newOffer.expires_at||null,secondsRemaining:e.seconds,reason:r.reason||null,offer:r.newOffer};
}

export async function getMarketingLiveOffers(limit=30){
 const cutoff=new Date(Date.now()-MAX_AGE_MS);
 const conversations=await db.doniConversation.findMany({where:{updatedAt:{gte:cutoff}},orderBy:{updatedAt:'desc'},take:Math.max(5,Math.min(limit,60)),select:{id:true,state:true}});
 const ids=conversations.filter(c=>asOffer((c.state as any)?.selected_offer)).map(c=>c.id);
 const results=[] as VerifiedOffer[];for(const id of ids.slice(0,20)){const v=await verifyConversationOffer(id);if(v)results.push(v);}
 const usable=results.filter(x=>x.status==='VERIFIED'||x.status==='CHANGED');
 const unavailable=results.filter(x=>x.status==='UNAVAILABLE'||x.status==='EXPIRED').length;
 const unsupported=results.filter(x=>x.status==='UNSUPPORTED').length;
 return {metrics:{checked:results.length,verified:usable.length,changed:results.filter(x=>x.status==='CHANGED').length,unavailable,unsupported},offers:results,providers:{duffel:{connected:true,repricing:true},pkfare:{connected:false,repricing:false}},generatedAt:new Date().toISOString()};
}

export async function createLiveOfferCampaignDraft(conversationId:string){
 const verified=await verifyConversationOffer(conversationId);if(!verified)return {ok:false,reason:'selected_offer_not_found'} as const;
 if(!['VERIFIED','CHANGED'].includes(verified.status))return {ok:false,reason:`offer_not_publishable:${verified.status}`} as const;
 if(!verified.offer)return {ok:false,reason:'verified_offer_missing'} as const;
 const id=randomUUID();const now=new Date().toISOString();const value={id,status:'DRAFT',source:'LIVE_OFFER_ENGINE',conversationId,provider:verified.provider,offerId:verified.offerId,origin:verified.origin,destination:verified.destination,departDate:verified.departDate,returnDate:verified.returnDate,price:verified.price,currency:verified.currency,verifiedAt:verified.verifiedAt,expiresAt:verified.expiresAt,headline:`${verified.origin} → ${verified.destination} à partir de ${verified.price.toFixed(2)} ${verified.currency}`,disclaimer:'Tarif et disponibilité vérifiés au moment de la création. Repricing obligatoire avant publication ou envoi.',createdAt:now};
 await db.appSetting.create({data:{key:`${PREFIX}campaign.${id}`,category:CAMPAIGN_CATEGORY,value:value as any}});return {ok:true,draft:value} as const;
}

export async function listLiveOfferCampaignDrafts(){const rows=await db.appSetting.findMany({where:{category:CAMPAIGN_CATEGORY,key:{startsWith:`${PREFIX}campaign.`}},orderBy:{createdAt:'desc'},take:30});return rows.map(x=>x.value as any);}
