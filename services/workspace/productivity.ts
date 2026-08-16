import {db} from '@/lib/db';
import {getDepartmentsForUsers,departmentLabel} from '@/lib/auth/departments';
import {listWorkspaceTasks} from '@/lib/workspace/tasks';

export async function getProductivityOverview(){
 const [users,tasks]=await Promise.all([
  db.portalUser.findMany({where:{active:true},orderBy:[{role:'desc'},{fullName:'asc'}],select:{id:true,username:true,fullName:true,role:true}}),
  listWorkspaceTasks({includeDone:true}),
 ]);
 const departments=await getDepartmentsForUsers(users.map(u=>u.id));
 const now=Date.now();
 const startToday=new Date();startToday.setHours(0,0,0,0);
 const endToday=new Date(startToday);endToday.setDate(endToday.getDate()+1);
 const rows=users.map(u=>{
  const mine=tasks.filter(t=>t.assigneeId===u.id);
  const open=mine.filter(t=>t.status!=='DONE');
  const overdue=open.filter(t=>t.dueAt&&new Date(t.dueAt).getTime()<now);
  const dueToday=open.filter(t=>t.dueAt&&new Date(t.dueAt)>=startToday&&new Date(t.dueAt)<endToday);
  const blocked=open.filter(t=>t.status==='BLOCKED');
  const inProgress=open.filter(t=>t.status==='IN_PROGRESS');
  const urgent=open.filter(t=>t.priority==='URGENT');
  const doneToday=mine.filter(t=>t.status==='DONE'&&new Date(t.updatedAt)>=startToday);
  const score=open.length+overdue.length*2+blocked.length*2+urgent.length;
  return {id:u.id,name:u.fullName||u.username,role:u.role,department:departments.get(u.id)||null,departmentLabel:departmentLabel(departments.get(u.id)||null),open:open.length,overdue:overdue.length,dueToday:dueToday.length,blocked:blocked.length,inProgress:inProgress.length,urgent:urgent.length,doneToday:doneToday.length,score};
 }).sort((a,b)=>b.score-a.score||b.open-a.open);
 const summary={open:tasks.filter(t=>t.status!=='DONE').length,overdue:tasks.filter(t=>t.status!=='DONE'&&t.dueAt&&new Date(t.dueAt).getTime()<now).length,blocked:tasks.filter(t=>t.status==='BLOCKED').length,unassigned:tasks.filter(t=>t.status!=='DONE'&&!t.assigneeId).length,doneToday:tasks.filter(t=>t.status==='DONE'&&new Date(t.updatedAt)>=startToday).length};
 const departmentMap=new Map<string,{department:string;open:number;overdue:number;blocked:number;urgent:number}>();
 for(const t of tasks.filter(t=>t.status!=='DONE')){const key=t.department;const d=departmentMap.get(key)||{department:key,open:0,overdue:0,blocked:0,urgent:0};d.open++;if(t.dueAt&&new Date(t.dueAt).getTime()<now)d.overdue++;if(t.status==='BLOCKED')d.blocked++;if(t.priority==='URGENT')d.urgent++;departmentMap.set(key,d)}
 return {summary,rows,departments:[...departmentMap.values()].sort((a,b)=>b.open-a.open)};
}
