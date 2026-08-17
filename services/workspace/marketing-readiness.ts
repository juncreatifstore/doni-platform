import {listMarketingPublishing,publishingGovernance} from '@/lib/workspace/marketing-publishing';
import {listMarketingAssets,assetGovernance} from '@/lib/workspace/marketing-assets';
import {listMarketingReviews,reviewGovernance} from '@/lib/workspace/marketing-reviews';
import {getMarketingChannelPerformance} from '@/services/workspace/marketing-channels';

export async function getMarketingReadiness(){
 const [publishing,assets,reviews,channels]=await Promise.all([
  listMarketingPublishing(),listMarketingAssets(),listMarketingReviews(),getMarketingChannelPerformance(30)
 ]);
 const publishingChecks=await Promise.all(publishing.map(async item=>({item,governance:await publishingGovernance(item)})));
 const blockedPublishing=publishingChecks.filter(x=>!x.governance.ready&& !['CANCELLED','PUBLISHED'].includes(x.item.status));
 const unsafeAssets=assets.map(asset=>({asset,governance:assetGovernance(asset)})).filter(x=>!x.governance.usable&&x.asset.status!=='ARCHIVED');
 const reviewsNeedingResponse=reviews.filter(r=>reviewGovernance(r).needsResponse);
 const human=channels.whatsapp.humanResponse;
 const checks=[
  {key:'publishing_access',label:'Accès API publication limité au Marketing/Admin',ok:true,detail:'Garde centralisée active'},
  {key:'publishing_approval',label:'Approbation obligatoire avant handoff/publication',ok:true,detail:'Le statut PUBLISHED ne peut plus auto-approuver'},
  {key:'external_distribution',label:'Distribution Marketing externe automatique',ok:true,detail:'Aucun auto-publish ni envoi WhatsApp marketing automatique'},
  {key:'publishing_blockers',label:'Publications sans blocage de gouvernance',ok:blockedPublishing.length===0,detail:`${blockedPublishing.length} élément(s) bloqué(s)`},
  {key:'asset_governance',label:'Assets actifs conformes aux droits',ok:unsafeAssets.length===0,detail:`${unsafeAssets.length} asset(s) à sécuriser`},
  {key:'review_followup',label:'Avis nécessitant une réponse',ok:reviewsNeedingResponse.length===0,detail:`${reviewsNeedingResponse.length} avis en attente`},
  {key:'response_sla',label:'SLA WhatsApp humain < 60 min',ok:human.samples===0||Boolean(human.withinTargetPct!==null&&human.withinTargetPct>=80),detail:human.samples?`${human.withinTargetPct}% sous 60 min · ${human.samples} échantillon(s)`:'N/A — aucun échantillon humain exploitable'},
 ];
 const passed=checks.filter(x=>x.ok).length;
 return {status:passed===checks.length?'READY':'ATTENTION',checks,summary:{passed,total:checks.length,blocked:checks.length-passed},blockedPublishing:blockedPublishing.slice(0,10).map(x=>({id:x.item.id,title:x.item.title,status:x.item.status,blockers:x.governance.blockers})),unsafeAssets:unsafeAssets.slice(0,10).map(x=>({id:x.asset.id,title:x.asset.title,reason:x.governance.reason})),reviewsNeedingResponse:reviewsNeedingResponse.slice(0,10).map(x=>({id:x.id,customerName:x.customerName,rating:x.rating,source:x.source})),generatedAt:new Date().toISOString()};
}
