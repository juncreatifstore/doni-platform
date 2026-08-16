import {db} from '@/lib/db';
import {getDepartmentsForUsers} from '@/lib/auth/departments';
import {upsertInternalNotification,type NotificationSeverity} from '@/lib/workspace/notifications';
import {listMarketingLeads} from '@/lib/workspace/marketing';
import {listMarketingCampaigns} from '@/lib/workspace/marketing-campaigns';
import {listMarketingStudio} from '@/lib/workspace/marketing-studio';
import {listMarketingPartnerships} from '@/lib/workspace/marketing-partnerships';

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
 const [leads,campaigns,studio,partnerships,fallback]=await Promise.all([listMarketingLeads(),listMarketingCampaigns(),listMarketingStudio(),listMarketingPartnerships(),fallbackRecipients()]);
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
 return {ranAt:new Date().toISOString(),notifications,rules:{leadFollowUp:true,studioReview:true,campaignReviewDays:7,partnershipFollowUp:true}};
}
