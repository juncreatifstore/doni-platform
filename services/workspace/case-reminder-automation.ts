import {db} from '@/lib/db';
import {upsertInternalNotification} from '@/lib/workspace/notifications';
import {getCasePortfolio} from '@/services/workspace/case-portfolio';
import {case360Accessible} from '@/services/workspace/case-360';
import type {SafeUser} from '@/lib/auth/session';
import {getUserDepartment} from '@/lib/auth/departments';
import {getUserOrgRole} from '@/lib/auth/org-roles';

const REMINDER_WINDOW_MINUTES=60;
const MANAGER_ESCALATION_MINUTES=120;
const SYSTEM_USER:SafeUser={id:'DONI_AUTOMATION',username:'doni-automation',fullName:'DONI Automation',email:null,role:'SUPER_ADMIN',country:null,active:true,department:null,orgRole:'SUPER_ADMIN'};
function minutesUntil(value:string){return Math.round((new Date(value).getTime()-Date.now())/60000);}
function dueToken(value:string){return new Date(value).toISOString().replace(/[^0-9]/g,'').slice(0,14);}

async function escalationUsers(){
 const rows=await db.portalUser.findMany({where:{active:true},select:{id:true,username:true,fullName:true,email:true,role:true,country:true,active:true}});
 const users:SafeUser[]=[];
 for(const row of rows){
  const [department,orgRole]=await Promise.all([getUserDepartment(row.id),getUserOrgRole(row.id,row.role)]);
  if(orgRole!=='SUPER_ADMIN'&&orgRole!=='COUNTRY_ADMIN')continue;
  users.push({...row,department,orgRole});
 }
 return users;
}

export async function runCaseReminderAutomation(){
 const {rows}=await getCasePortfolio(SYSTEM_USER);
 const managers=await escalationUsers();
 let generated=0;
 for(const c of rows){
  if(!c.nextAction||!c.nextActionDueAt)continue;
  const mins=minutesUntil(c.nextActionDueAt);
  const token=dueToken(c.nextActionDueAt);
  const href=c.href;
  const priorityCritical=c.priority==='URGENT';

  if(c.ownerId&&mins>=0&&mins<=REMINDER_WINDOW_MINUTES){
   await upsertInternalNotification({
    recipientId:c.ownerId,
    title:'Prochaine action à effectuer',
    message:`${c.title} · ${c.nextAction} · dans ${mins} min`,
    severity:priorityCritical?'CRITICAL':'WARNING',
    href,
    dedupeKey:`case:${c.kind}:${c.caseId}:due:${token}:owner-warning:${c.ownerId}`,
   });
   generated++;
  }

  if(c.ownerId&&mins<0){
   await upsertInternalNotification({
    recipientId:c.ownerId,
    title:'Relance dossier en retard',
    message:`${c.title} · ${c.nextAction} · retard ${Math.abs(mins)} min`,
    severity:'CRITICAL',
    href,
    dedupeKey:`case:${c.kind}:${c.caseId}:due:${token}:owner-overdue:${c.ownerId}`,
   });
   generated++;
  }

  const eligibleManagers:SafeUser[]=[];
  for(const manager of managers){
   if(await case360Accessible(c.kind as any,c.caseId,manager).catch(()=>false))eligibleManagers.push(manager);
  }

  if(!c.ownerId&&mins<=REMINDER_WINDOW_MINUTES){
   for(const a of eligibleManagers){
    await upsertInternalNotification({
     recipientId:a.id,
     title:mins<0?'Dossier non assigné en retard':'Dossier à assigner avant relance',
     message:`${c.title} · ${c.nextAction}${mins<0?` · retard ${Math.abs(mins)} min`:` · dans ${Math.max(0,mins)} min`}`,
     severity:mins<0||priorityCritical?'CRITICAL':'WARNING',
     href:'/cases',
     dedupeKey:`case:${c.kind}:${c.caseId}:due:${token}:unassigned:${a.id}:${mins<0?'overdue':'warning'}`,
    });
    generated++;
   }
  }

  if(c.ownerId&&mins<=-MANAGER_ESCALATION_MINUTES){
   for(const a of eligibleManagers){
    await upsertInternalNotification({
     recipientId:a.id,
     title:'Relance dossier à escalader',
     message:`${c.title} · ${c.ownerName||'propriétaire inconnu'} · retard ${Math.abs(mins)} min`,
     severity:'CRITICAL',
     href,
     dedupeKey:`case:${c.kind}:${c.caseId}:due:${token}:manager-escalation:${a.id}`,
    });
    generated++;
   }
  }
 }
 return {generated,checked:rows.length,reminderWindowMinutes:REMINDER_WINDOW_MINUTES,managerEscalationMinutes:MANAGER_ESCALATION_MINUTES};
}
