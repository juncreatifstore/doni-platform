import { db } from '@/lib/db';
export async function audit(input:{userId?:string|null;action:string;entity?:string;entityId?:string;metadata?:unknown}){
  try { await db.auditLog.create({data:{userId:input.userId||null,action:input.action,entity:input.entity,entityId:input.entityId,metadata:input.metadata as never}}); } catch(e){ console.error('audit_failed',e); }
}
