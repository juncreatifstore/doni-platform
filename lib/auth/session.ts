import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PortalUser, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { hasRole } from './permissions';
import { getUserDepartment, type Department } from './departments';
import {getUserOrgRole,type OrgRole} from './org-roles';
import {recordSessionMetadata} from './session-security';
import {upsertInternalNotification} from '@/lib/workspace/notifications';

export const SESSION_COOKIE = 'doni_session';
const DAYS = Number(process.env.AUTH_SESSION_DAYS || 7);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type SafeUser = Pick<PortalUser,'id'|'username'|'fullName'|'email'|'role'|'country'|'active'> & {department:Department|null;orgRole:OrgRole};
export function safeUser(u: PortalUser, department:Department|null=null,orgRole:OrgRole='AGENT'): SafeUser { return { id:u.id,username:u.username,fullName:u.fullName,email:u.email,role:u.role,country:u.country,active:u.active,department,orgRole }; }

export async function createPortalSession(userId: string, req?:Request, mfaMethod?:string|null) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  const session=await db.portalSession.create({data:{userId,tokenHash:hashToken(token),expiresAt},select:{id:true}});
  await recordSessionMetadata(session.id,req,mfaMethod);
  await upsertInternalNotification({recipientId:userId,title:'Nouvelle connexion à DONI',message:'Une nouvelle session vient d’être ouverte sur ton compte. Si ce n’était pas toi, révoque immédiatement les autres sessions depuis Sécurité du compte.',severity:'WARNING',href:'/security',dedupeKey:`auth:new-session:${session.id}`}).catch(()=>{});
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', path:'/', expires:expiresAt });
  return expiresAt;
}
export async function destroyPortalSession() {
  const jar=await cookies(); const token=jar.get(SESSION_COOKIE)?.value;
  if(token) await db.portalSession.deleteMany({where:{tokenHash:hashToken(token)}}).catch(()=>{});
  jar.set(SESSION_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});
}
export async function getCurrentUser(): Promise<SafeUser|null> {
  const jar=await cookies(); const token=jar.get(SESSION_COOKIE)?.value; if(!token)return null;
  const session=await db.portalSession.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});
  if(!session || session.expiresAt<=new Date() || !session.user.active){ if(session) await db.portalSession.delete({where:{id:session.id}}).catch(()=>{}); return null; }
  const [department,orgRole]=await Promise.all([getUserDepartment(session.user.id),getUserOrgRole(session.user.id,session.user.role)]);
  return safeUser(session.user,department,orgRole);
}
export async function requirePageUser(minimum:UserRole='AGENT') {
  const user=await getCurrentUser(); if(!user) redirect('/login'); if(!hasRole(user.role,minimum)) redirect('/overview?forbidden=1'); return user;
}
export async function requireApiUser(minimum:UserRole='AGENT') {
  const user=await getCurrentUser();
  if(!user) return {ok:false as const,status:401,error:'unauthenticated'};
  if(!hasRole(user.role,minimum)) return {ok:false as const,status:403,error:'forbidden'};
  return {ok:true as const,user};
}
