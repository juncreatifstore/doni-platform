import {getMarketingSearchIntelligence} from '@/lib/workspace/marketing-search-intelligence';
import {getAbandonedBookingRecovery} from '@/lib/workspace/marketing-abandoned-booking';
import {getMarketingLiveOffers} from '@/lib/workspace/marketing-live-offers';
import {getPublisherControlCenter} from '@/lib/workspace/marketing-publisher-control';
import {getMarketingConsentDashboard} from '@/lib/workspace/marketing-consent';
import {getMarketingDeliveryDashboard} from '@/lib/workspace/marketing-delivery-tracking';
import {getMarketingLearningLoop} from '@/lib/workspace/marketing-learning-loop';
import {getMarketingExperiments} from '@/lib/workspace/marketing-experiments';

type CheckLevel='PASS'|'WARNING'|'CRITICAL';
type ReadinessCheck={id:string;label:string;level:CheckLevel;detail:string;route:string};

export async function getMarketingCommandCenter(){
 const [search,recovery,live,publisher,consent,delivery,learning,experiments]=await Promise.all([
  getMarketingSearchIntelligence(30),
  getAbandonedBookingRecovery(30),
  getMarketingLiveOffers(30),
  getPublisherControlCenter(),
  getMarketingConsentDashboard(),
  getMarketingDeliveryDashboard(),
  getMarketingLearningLoop(),
  getMarketingExperiments()
 ]);
 const checks:ReadinessCheck[]=[];
 const add=(id:string,label:string,level:CheckLevel,detail:string,route:string)=>checks.push({id,label,level,detail,route});
 const worker=String(publisher.health.status);
 add('publisher-worker','Publisher Worker',worker==='HEALTHY'?'PASS':worker==='DEGRADED'?'WARNING':'CRITICAL',worker==='HEALTHY'?'Heartbeat récent et worker opérationnel.':worker==='DEGRADED'?'Heartbeat ancien : surveiller le prochain passage.':'Aucun heartbeat récent fiable : ne pas considérer les envois production comme disponibles.','/marketing/publisher-control');
 const duffel=Boolean((live as any).providers?.duffel?.connected);
 add('duffel','Duffel Live Offers',duffel?'PASS':'CRITICAL',duffel?'Recherche/repricing live disponible.':'Le moteur de prix live Duffel n’est pas connecté.','/marketing/live-offers');
 const pkfare=Boolean((live as any).providers?.pkfare?.connected);
 add('pkfare','PKFARE',pkfare?'PASS':'WARNING',pkfare?'Provider secondaire connecté.':'PKFARE n’est pas encore actif dans Live Offers ; Duffel reste le provider live principal.','/marketing/live-offers');
 add('publisher-policy','Publisher Policy Guard',publisher.policy.globalPause?'WARNING':'PASS',publisher.policy.globalPause?'Pause globale activée : aucun envoi marketing ne partira.':`Limites actives : ${publisher.policy.maxPerRun}/passage, ${publisher.policy.maxPerHour}/heure, ${publisher.policy.maxPerRecipient24h}/destinataire/24h.`,'/marketing/publisher-control');
 add('consent','Consent & Opt-out',consent.policy.requireExplicitConsent?'PASS':'WARNING',consent.policy.requireExplicitConsent?'Consentement explicite obligatoire.':'Opt-out bloqué, mais le mode consentement explicite obligatoire est désactivé.','/marketing/consent');
 const failureRate=delivery.counts.SENT?Math.round(delivery.counts.FAILED/delivery.counts.SENT*1000)/10:0;
 add('delivery','Delivery Tracking',failureRate>10?'CRITICAL':delivery.counts.SENT===0?'WARNING':'PASS',delivery.counts.SENT===0?'Aucun envoi réel encore mesuré.':`${delivery.counts.SENT} suivis · ${delivery.rates.deliveredRate}% livrés · ${failureRate}% échecs.`,'/marketing/delivery-analytics');
 const safeExperiments=experiments.safety.autoSend===false&&experiments.safety.autoWinner===false&&experiments.safety.automaticPromotion===false&&experiments.safety.learningAutoApply===false;
 add('experiments','Experiment Safety',safeExperiments?'PASS':'CRITICAL',safeExperiments?'Auto-send, auto-winner, auto-promotion et auto-apply sont désactivés.':'Un garde-fou d’expérimentation n’est plus dans son état sécurisé.','/marketing/experiments');
 add('learning','Learning Loop',learning.mode==='ADVISORY_ONLY'?'PASS':'CRITICAL',learning.mode==='ADVISORY_ONLY'?`${learning.summary.mature} campagnes matures · apprentissage consultatif uniquement.`:'Le Learning Loop n’est plus en mode consultatif.','/marketing/learning-loop');
 if(publisher.counts.FAILED>0)add('publisher-failures','Échecs Publisher','WARNING',`${publisher.counts.FAILED} événement(s) FAILED dans la fenêtre d’audit. Examiner avant montée en volume.`,'/marketing/publisher-control');
 const critical=checks.filter(x=>x.level==='CRITICAL').length;
 const warnings=checks.filter(x=>x.level==='WARNING').length;
 const passed=checks.filter(x=>x.level==='PASS').length;
 const score=Math.max(0,Math.min(100,100-critical*25-warnings*7));
 const readiness=critical>0?'NOT_READY':warnings>0?'CONDITIONAL':'READY';
 const modules=[
  {name:'Search Intelligence',route:'/marketing/search-intelligence',status:'ACTIVE',primary:`${search.metrics.searches} recherches / 30j`,secondary:`${search.metrics.highIntent} forte intention`},
  {name:'Abandoned Recovery',route:'/marketing/abandoned-bookings',status:'ACTIVE',primary:`${recovery.metrics.total} opportunités`,secondary:`${recovery.metrics.PAYMENT_ABANDONED} paiement abandonné`},
  {name:'Live Offers',route:'/marketing/live-offers',status:duffel?'ACTIVE':'BLOCKED',primary:`${live.metrics.verified} offres vérifiées`,secondary:duffel?'Duffel connecté':'Duffel déconnecté'},
  {name:'Publisher',route:'/marketing/publisher-control',status:worker==='HEALTHY'?'ACTIVE':worker,primary:`${publisher.counts.SENT} envoyés`,secondary:`${publisher.counts.DEFERRED} différés · ${publisher.counts.FAILED} échecs`},
  {name:'Consent',route:'/marketing/consent',status:'ACTIVE',primary:`${consent.counts.OPTED_IN} opt-in · ${consent.counts.OPTED_OUT} opt-out`,secondary:consent.policy.requireExplicitConsent?'Mode strict ON':'Mode strict OFF'},
  {name:'Delivery & Conversion',route:'/marketing/delivery-analytics',status:'ACTIVE',primary:`${delivery.rates.readRate}% lecture · ${delivery.rates.replyRate}% réponse`,secondary:`${delivery.rates.conversionRate}% conversion 7j`},
  {name:'Learning Loop',route:'/marketing/learning-loop',status:'ADVISORY',primary:`Score global ${learning.summary.globalScore}/100`,secondary:`${learning.winningLearnings?.length||0} learnings validés`},
  {name:'Experiments',route:'/marketing/experiments',status:'CONTROLLED',primary:`${experiments.counts.RUNNING} en cours · ${experiments.counts.COMPLETED} terminés`,secondary:`${experiments.promoted} gagnants promus`}
 ];
 return{readiness,score,critical,warnings,passed,checks,modules,metrics:{searches:search.metrics.searches,highIntent:search.metrics.highIntent,abandoned:recovery.metrics.total,verifiedOffers:live.metrics.verified,sent:delivery.counts.SENT,readRate:delivery.rates.readRate,replyRate:delivery.rates.replyRate,conversionRate:delivery.rates.conversionRate,learningScore:learning.summary.globalScore,experimentsRunning:experiments.counts.RUNNING,promotedLearnings:experiments.promoted},generatedAt:new Date().toISOString()};
}
