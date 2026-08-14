import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PortalUser, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { hasRole } from './permissions';

export const SESSION_COOKIE = 'doni_session';
const DAYS = Number(process.env.AUTH_SESSION_DAYS || 7);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type SafeUser = Pick<PortalUser,'id'|'username'|'fullName'|'email'|'role'|'country'|'active'>;
export function safeUser(u: PortalUser): SafeUser { return { id:u.id,username:u.username,fullName:u.fullName,email:u.email,role:u.role,country:u.country,active:u.active }; }

export async function createPortalSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  await db.portalSession.create({data:{userId,tokenHash:hashToken(token),expiresAt}});
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
  return safeUser(session.user);
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
