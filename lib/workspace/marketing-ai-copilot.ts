import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {getMarketingSearchIntelligence} from '@/lib/workspace/marketing-search-intelligence';
import {getAbandonedBookingRecovery} from '@/lib/workspace/marketing-abandoned-booking';
import {getMarketingLiveOffers} from '@/lib/workspace/marketing-live-offers';

const CATEGORY='DONI Marketing AI Copilot Drafts';
const PREFIX='marketing.ai-copilot.';

type Priority='CRITICAL'|'HIGH'|'MEDIUM'|'LOW';
type Recommendation={id:string;type:'RECOVERY'|'LIVE_OFFER'|'DEMAND'|'DATA_QUALITY';priority:Priority;score:number;title:string;reason:string;recommendedAction:string;conversationId?:string|null;destination?:string|null;route?:string|null;amount?:number|null;currency?:string|null;canGenerate:boolean;source:string};

function priority(score:number):Priority{return score>=85?'CRITICAL':score>=65?'HIGH':score>=40?'MEDIUM':'LOW';}
function cap(n:number){return Math.max(0,Math.min(100,Math.round(n)));}

export async function getMarketingAICopilot(){
 const [search,recovery,live]=await Promise.all([getMarketingSearchIntelligence(30),getAbandonedBookingRecovery(30),getMarketingLiveOffers(30)]);
 const recommendations:Recommendation[]=[];

 for(const x of recovery.opportunities.slice(0,20)){
  let score=x.priority;
  if(x.stage==='PAYMENT_ABANDONED')score+=10;
  if(x.ageHours<=24)score+=5;
  score=cap(score);
  recommendations.push({id:`recovery:${x.conversationId}`,type:'RECOVERY',priority:priority(score),score,title:`Récupérer ${x.route.origin||'—'} → ${x.route.destination||'—'}`,reason:`${x.stage} · dernière activité il y a ${x.ageHours} h${x.observedAmount>0?` · valeur observée ${x.observedAmount.toFixed(2)} ${x.currency}`:''}`,recommendedAction:x.stage==='PAYMENT_ABANDONED'?'Repricer l’offre, vérifier le moyen de paiement puis préparer une relance personnalisée.':'Vérifier la disponibilité actuelle puis préparer une relance adaptée au niveau d’intention.',conversationId:x.conversationId,destination:x.route.destination,route:`${x.route.origin||'—'}-${x.route.destination||'—'}`,amount:x.observedAmount||null,currency:x.currency,canGenerate:true,source:'V2.2 Abandoned Booking Recovery'});
 }

 for(const x of live.offers.filter(o=>o.status==='VERIFIED'||o.status==='CHANGED').slice(0,12)){
  let score=70;
  if(x.status==='CHANGED')score+=5;
  if(x.secondsRemaining!==null&&x.secondsRemaining<3600)score+=10;
  score=cap(score);
  recommendations.push({id:`offer:${x.conversationId}:${x.offerId}`,type:'LIVE_OFFER',priority:priority(score),score,title:`Offre vérifiée ${x.origin} → ${x.destination}`,reason:`${x.provider.toUpperCase()} · ${x.price.toFixed(2)} ${x.currency}${x.secondsRemaining!==null?` · ${Math.floor(x.secondsRemaining/60)} min restantes`:''}`,recommendedAction:'Préparer un brouillon de campagne ou une relance ciblée, avec repricing obligatoire immédiatement avant diffusion.',conversationId:x.conversationId,destination:x.destination,route:`${x.origin}-${x.destination}`,amount:x.price,currency:x.currency,canGenerate:true,source:'V2.3 Live Offers Engine'});
 }

 for(const x of search.destinations.slice(0,8)){
  const score=cap(35+x.searches*8+x.selected*10);
  recommendations.push({id:`demand:${x.destination}`,type:'DEMAND',priority:priority(score),score,title:`Demande en hausse vers ${x.destination}`,reason:`${x.searches} recherches · ${x.people} clients · ${x.selected} sélections sur 30 jours`,recommendedAction:'Créer un segment d’audience pour cette destination et rechercher une offre live vérifiable avant de préparer une campagne.',destination:x.destination,canGenerate:true,source:'V2.1 Search Intelligence'});
 }

 if(live.providers.pkfare.connected===false)recommendations.push({id:'data:pkfare',type:'DATA_QUALITY',priority:'MEDIUM',score:50,title:'Connecter PKFARE au Live Offers Engine',reason:'PKFARE n’a actuellement aucun adaptateur de recherche/repricing actif dans le dépôt.',recommendedAction:'Ajouter l’adaptateur PKFARE avant d’utiliser ses tarifs dans les recommandations ou campagnes.',canGenerate:false,source:'V2.3 Provider Readiness'});

 recommendations.sort((a,b)=>b.score-a.score);
 const top=recommendations.slice(0,30);
 const critical=top.filter(x=>x.priority==='CRITICAL').length,high=top.filter(x=>x.priority==='HIGH').length;
 const summary={searches:search.metrics.searches,highIntent:search.metrics.highIntent,abandoned:recovery.metrics.total,liveVerified:live.metrics.verified,critical,high};
 return {summary,recommendations:top,search,recovery,live,generatedAt:new Date().toISOString(),mode:'DECISION_ENGINE' as const};
}

export async function generateCopilotDraft(recommendationId:string){
 const data=await getMarketingAICopilot();const r=data.recommendations.find(x=>x.id===recommendationId);if(!r)return {ok:false,reason:'recommendation_not_found'} as const;if(!r.canGenerate)return {ok:false,reason:'generation_not_allowed'} as const;
 const id=randomUUID();const now=new Date().toISOString();
 const audience=r.type==='RECOVERY'?'Client individuel à forte intention':r.type==='LIVE_OFFER'?'Audience liée à la route et aux recherches récentes':'Audience ayant recherché cette destination récemment';
 const objective=r.type==='RECOVERY'?'Récupérer une réservation abandonnée':r.type==='LIVE_OFFER'?'Transformer une offre live en opportunité marketing':'Capitaliser sur la demande détectée';
 const message=r.type==='RECOVERY'?`Votre recherche ${r.route||''} est toujours intéressante. Nous pouvons vérifier le tarif et la disponibilité actuels avant de poursuivre votre réservation.`:r.type==='LIVE_OFFER'?`Une opportunité de voyage ${r.route||''} vient d’être détectée. Tarif et disponibilité doivent être revérifiés juste avant toute communication.`:`La demande vers ${r.destination||'cette destination'} augmente. Préparer une campagne ciblée uniquement après validation d’une offre réelle.`;
 const value={id,status:'AI_READY',recommendationId:r.id,type:r.type,priority:r.priority,score:r.score,title:r.title,objective,audience,message,channelSuggestion:r.type==='RECOVERY'?'WhatsApp 1:1':'WhatsApp + social + email',budgetSuggestion:r.type==='DEMAND'?'À définir après validation d’une offre live':'Aucune dépense automatique',conversationId:r.conversationId||null,destination:r.destination||null,route:r.route||null,amount:r.amount||null,currency:r.currency||null,source:r.source,approvalRequired:true,publicationAllowed:false,disclaimer:'Brouillon préparé par DONI. Validation humaine obligatoire. Toute mention de prix doit être repricée avant envoi ou publication.',createdAt:now};
 await db.appSetting.create({data:{key:`${PREFIX}${id}`,category:CATEGORY,value:value as any}});return {ok:true,draft:value} as const;
}

export async function listCopilotDrafts(){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{createdAt:'desc'},take:50});return rows.map(x=>x.value as any);}
