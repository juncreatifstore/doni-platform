import {db} from '@/lib/db';
import {getDepartmentsForUsers} from '@/lib/auth/departments';
import {listMarketingLeads} from '@/lib/workspace/marketing';
import {listMarketingCampaigns} from '@/lib/workspace/marketing-campaigns';
import {listMarketingStudio} from '@/lib/workspace/marketing-studio';
import {listMarketingPartnerships} from '@/lib/workspace/marketing-partnerships';
import {listWorkspaceTasks} from '@/lib/workspace/tasks';

export const MARKETING_JOB_ROLES=['MARKETING_MANAGER','COMMUNITY_MANAGER','CONTENT_CREATOR','ADS_MANAGER','PARTNERSHIPS_MANAGER'] as const;
export type MarketingJobRole=(typeof MARKETING_JOB_ROLES)[number];
export const MARKETING_JOB_LABELS:Record<MarketingJobRole,string>={MARKETING_MANAGER:'Responsable Marketing',COMMUNITY_MANAGER:'Community Manager',CONTENT_CREATOR:'Créateur de contenu',ADS_MANAGER:'Chargé Ads',PARTNERSHIPS_MANAGER:'Partenariats & Terrain'};
const PREFIX='marketing.team.role.';
const CATEGORY='Marketing Team';
function validRole(v:unknown):v is MarketingJobRole{return typeof v==='string'&&(MARKETING_JOB_ROLES as readonly string[]).includes(v);}
export async function getMarketingJobRole(userId:string){const row=await db.appSetting.findUnique({where:{key:`${PREFIX}${userId}`}}).catch(()=>null);return validRole(row?.value)?row!.value:null;}
export async function setMarketingJobRole(userId:string,role:MarketingJobRole|null,updatedBy:string){const user=await db.portalUser.findUnique({where:{id:userId},select:{id:true,active:true}});if(!user||!user.active)throw new Error('user_not_found');const depts=await getDepartmentsForUsers([userId]);if(depts.get(userId)!=='MARKETING')throw new Error('marketing_department_required');const key=`${PREFIX}${userId}`;if(!role){await db.appSetting.deleteMany({where:{key}});return null;}await db.appSetting.upsert({where:{key},create:{key,category:CATEGORY,value:role,updatedBy},update:{value:role,updatedBy}});return role;}
export async function marketingTeamWorkspace(){const users=await db.portalUser.findMany({where:{active:true},orderBy:{fullName:'asc'},select:{id:true,username:true,fullName:true,email:true,role:true}});const depts=await getDepartmentsForUsers(users.map(u=>u.id));const marketingUsers=users.filter(u=>depts.get(u.id)==='MARKETING');const roleRows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}}});const roles=new Map<string,MarketingJobRole>();for(const row of roleRows){const uid=row.key.replace(PREFIX,'');if(validRole(row.value))roles.set(uid,row.value);}
 const [leads,campaigns,studio,partnerships,tasks]=await Promise.all([listMarketingLeads(),listMarketingCampaigns(),listMarketingStudio(),listMarketingPartnerships(),listWorkspaceTasks({department:'MARKETING',includeDone:false})]);
 return marketingUsers.map(u=>{const openLeads=leads.filter(x=>x.ownerId===u.id&&!['CONVERTED','LOST'].includes(x.status)).length;const activeCampaigns=campaigns.filter(x=>x.ownerId===u.id&&['PLANNED','ACTIVE','PAUSED'].includes(x.status)).length;const studioOpen=studio.filter(x=>x.ownerId===u.id&&!['APPROVED','ARCHIVED'].includes(x.status)).length;const reviews=studio.filter(x=>x.reviewerId===u.id&&x.status==='REVIEW').length;const partnerOpen=partnerships.filter(x=>x.ownerId===u.id&&!['ACTIVE','SIGNED','LOST'].includes(x.status)).length;const openTasks=tasks.filter(x=>x.assigneeId===u.id).length;return {...u,jobRole:roles.get(u.id)||null,jobRoleLabel:roles.get(u.id)?MARKETING_JOB_LABELS[roles.get(u.id)!]:null,workload:{openLeads,activeCampaigns,studioOpen,reviews,partnerOpen,openTasks,total:openLeads+activeCampaigns+studioOpen+reviews+partnerOpen+openTasks}};});
}
