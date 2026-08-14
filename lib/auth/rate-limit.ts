import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
const WINDOW_MS=15*60*1000, MAX_FAILURES=5;
export function authFingerprint(username:string,req:Request){const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown';return createHash('sha256').update(`${username.toLowerCase()}|${ip}`).digest('hex');}
export async function isLoginBlocked(fingerprint:string){const since=new Date(Date.now()-WINDOW_MS);const failures=await db.authAttempt.count({where:{fingerprint,success:false,createdAt:{gte:since}}});return failures>=MAX_FAILURES;}
export async function recordLoginAttempt(fingerprint:string,success:boolean){await db.authAttempt.create({data:{fingerprint,success}});if(success)await db.authAttempt.deleteMany({where:{fingerprint,success:false}});}
