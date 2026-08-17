import {db} from '@/lib/db';
import {getDepartmentsForUsers} from '@/lib/auth/departments';
import {upsertInternalNotification,type NotificationSeverity} from '@/lib/workspace/notifications';
import {listMarketingLeads} from '@/lib/workspace/marketing';
import {listMarketingCampaigns} from '@/lib/workspace/marketing-campaigns';
import {listMarketingStudio} from '@/lib/workspace/marketing-studio';
import {listMarketingPartnerships} from '@/lib/workspace/marketing-partnerships';
import {assetGovernance,listMarketingAssets} from '@/lib/workspace/marketing-assets';
import {listMarketingSeasons,seasonReadiness} from '@/lib/workspace/marketing-seasonality';
import {listMarketingReviews,reviewGovernance} from '@/lib/workspace/marketing-reviews';
import {listMarketingLoyalty,loyaltyAttention} from '@/lib/workspace/marketing-loyalty';

const DAY=24*60*60*1000;
function overdue(value?:string|null){return Boolean(value&&new Date(value).getTime()<=Date.now());}
function ageMs(value:string){return Date.now()-new Date(value).getTime();}

async function fallbackRecipients(){
 const users=await db.portalUser.findMany({where:{active:true},select:{id:true,role:true}});
 const departments=await getDepartmentsForUsers(users.map(u=>u.id));
 return users.filter(u=>u.role!=='AGENT'||departments.get(u.id)==='MARKETING').map(u=>u.id);
}
async function notify(recipients:string[],input:{title:string;message:string;severity:NotificationSeverity;href:string;dedupeKey:string}){
 let count=0;
 for(const recipientId of [...new Set(recipients.filter(Boolean))]){await upsertInternalNotification({...input,recipientId});count++;}
 return count;
}
export async function runMarketingAutomation(){
 const [leads,campaigns,studio,partnerships,assets,seasons,reviews,loyalty,fallback]=await Promise.all([listMarketingLeads(),listMarketingCampaigns(),listMarketingStudio(),listMarketingPartnerships(),listMarketingAssets(),listMarketingSeasons(),listMarketingReviews(),listMarketingLoyalty(),fallbackRecipients()]);
 let notifications=0;
 for(const lead of leads){
  if(['CONVERTED','LOST'].includes(lead.status)||!overdue(lead.nextFollowUpAt))continue;
  const recipients=lead.ownerId?[lead.ownerId]:fallback;
  notifications+=await notify(recipients,{title:`Relance prospect · ${lead.name}`,message:`${lead.destination||'Destination à préciser'} · ${lead.status}. La relance prévue est arrivée à échéance.`,severity:lead.status==='HOT'?'CRITICAL':'WARNING',href:'/marketing/leads',dedupeKey:`marketing:lead-followup:${lead.id}:${lead.nextFollowUpAt}`});
 }
 for(const item of studio){
  const needsReview=item.status==='REVIEW'||item.status==='CHANGES_REQUESTED';
  if(!needsReview&&!overdue(item.dueAt))continue;
  if(['APPROVED','ARCHIVED'].includes(item.status))continue;
  const recipients=item.reviewerId?[item.reviewerId]:item.ownerId?[item.ownerId]:fallback;
  notifications+=await notify(recipients,{title:`Studio contenu · ${item.title}`,message:item.status==='REVIEW'?'Contenu en attente de validation.':item.status==='CHANGES_REQUESTED'?'Corrections demandées à traiter.':'Échéance de production dépassée.',severity:overdue(item.dueAt)?'WARNING':'INFO',href:'/marketing/studio',dedupeKey:`marketing:studio:${item.id}:${item.status}:${item.dueAt||'none'}`});
 }
 for(const campaign of campaigns){
  if(campaign.status!=='ACTIVE'||ageMs(campaign.updatedAt)<7*DAY)continue;
  const recipients=campaign.ownerId?[campaign.ownerId]:fallback;
  notifications+=await notify(recipients,{title:`Campagne à réviser · ${campaign.name}`,message:'Cette campagne est active et ses chiffres n’ont pas été actualisés depuis au moins 7 jours. Vérifier dépenses, leads, ventes et ROI.',severity:'WARNING',href:'/marketing/campaigns',dedupeKey:`marketing:campaign-review:${campaign.id}:${campaign.updatedAt.slice(0,10)}`});
 }
 for(const p of partnerships){
  if(['SIGNED','ACTIVE','LOST'].includes(p.status)||!overdue(p.nextActionAt))continue;
  const recipients=p.ownerId?[p.ownerId]:fallback;
  notifications+=await notify(recipients,{title:`Partenariat à relancer · ${p.name}`,message:`${p.nextAction||'Prochaine action à effectuer'} · statut ${p.status}.`,severity:'WARNING',href:'/marketing/partnerships',dedupeKey:`marketing:partnership:${p.id}:${p.nextActionAt}`});
 }
 for(const asset of assets){
  const g=assetGovernance(asset);
  if(g.reason==='RIGHTS_EXPIRED')notifications+=await notify(fallback,{title:`Droits expirés · ${asset.title}`,message:'Cet asset ne doit plus être utilisé tant que les droits ne sont pas renouvelés ou la ressource remplacée.',severity:'CRITICAL',href:'/marketing/assets',dedupeKey:`marketing:asset-expired:${asset.id}:${asset.expiresAt}`});
  else if(g.expiresSoon)notifications+=await notify(fallback,{title:`Droits bientôt expirés · ${asset.title}`,message:`Les droits expirent le ${asset.expiresAt?new Date(asset.expiresAt).toLocaleDateString('fr-FR'):'bientôt'}. Vérifier le renouvellement avant réutilisation.`,severity:'WARNING',href:'/marketing/assets',dedupeKey:`marketing:asset-expiring:${asset.id}:${asset.expiresAt}`});
  if(g.reason==='APPROVAL_REQUIRED')notifications+=await notify(fallback,{title:`Validation requise · ${asset.title}`,message:`Usage ${asset.usage} demandé mais asset non approuvé. Une validation Marketing est obligatoire avant usage externe.`,severity:'WARNING',href:'/marketing/assets',dedupeKey:`marketing:asset-approval:${asset.id}:${asset.status}:${asset.usage}`});
 }
 for(const season of seasons){
  if(['COMPLETED','CANCELLED'].includes(season.status))continue;
  const start=new Date(season.startAt).getTime(),prep=new Date(season.prepStartAt).getTime();
  if(Date.now()<prep||Date.now()>=start)continue;
  const r=seasonReadiness(season);if(r.percent>=100)continue;
  const days=Math.ceil((start-Date.now())/DAY),recipients=season.ownerId?[season.ownerId]:fallback;
  notifications+=await notify(recipients,{title:`Préparation saisonnière · ${season.title}`,message:`Lancement dans ${days} jour${days>1?'s':''}. Préparation ${r.percent}% (${r.done}/${r.total}). Compléter l’offre, le contenu, les assets, Ads, landing et tracking.`,severity:days<=30?'CRITICAL':'WARNING',href:'/marketing/seasonality',dedupeKey:`marketing:season-readiness:${season.id}:${season.startAt}`});
 }
 for(const review of reviews){
  const g=reviewGovernance(review);if(!g.needsResponse||ageMs(review.receivedAt)<DAY)continue;
  notifications+=await notify(fallback,{title:`Avis client à traiter · ${review.customerName}`,message:`Note ${review.rating}/5 via ${review.source}. Une réponse humaine est requise; aucune réponse ne sera envoyée automatiquement.`,severity:review.rating<=2?'CRITICAL':'WARNING',href:'/marketing/reviews',dedupeKey:`marketing:review-response:${review.id}:${review.status}`});
 }
 for(const customer of loyalty){
  const a=loyaltyAttention(customer);if(!a.needsAttention)continue;
  const detail=a.reason==='ACTION_DUE'?`${customer.nextAction||'Action de fidélité'}${customer.nextActionAt?` · échéance ${new Date(customer.nextActionAt).toLocaleString('fr-FR')}`:''}`:a.reason==='VIP_NO_ACTION'?'Client VIP sans prochaine action planifiée.':a.reason==='INACTIVE_180'?'Aucun achat depuis au moins 180 jours et aucune prochaine action planifiée.':'Client marqué À réactiver : préparer une action humaine de suivi.';
  notifications+=await notify(fallback,{title:`Fidélité · ${customer.customerName}`,message:`${a.label}. ${detail} Aucun message client ne sera envoyé automatiquement.`,severity:a.severity,href:'/marketing/loyalty',dedupeKey:`marketing:loyalty:${customer.id}:${a.reason}:${customer.nextActionAt||customer.lastPurchaseAt||customer.tier}`});
 }
 return {ranAt:new Date().toISOString(),notifications,rules:{leadFollowUp:true,studioReview:true,campaignReviewDays:7,partnershipFollowUp:true,assetRights:true,assetApproval:true,assetExpiryWarningDays:14,seasonPrepDays:60,seasonCriticalDays:30,reviewResponseHours:24,loyaltyActionDue:true,loyaltyInactiveDays:180,loyaltyVipWithoutAction:true}};
}
