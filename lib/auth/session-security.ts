import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {db} from '@/lib/db';

const SESSION_COOKIE='doni_session';
const CATEGORY='Auth Session Metadata';
const PREFIX='auth.session.meta.';
const STEP_UP_WINDOW_MS=10*60_000;
const PASSWORD_REAUTH_WINDOW_MS=5*60_000;
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');

function ipFromRequest(req?:Request){if(!req)return null;const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();return forwarded||req.headers.get('x-real-ip')||null;}
function ipFingerprint(ip:string|null){if(!ip)return null;const pepper=process.env.AUTH_SESSION_FINGERPRINT_KEY||process.env.AUTH_MFA_ENCRYPTION_KEY||'DONI_SESSION_FINGERPRINT_V1';return createHash('sha256').update(`${pepper}:${ip}`).digest('hex').slice(0,24);}
function deviceLabel(ua:string){const s=ua.toLowerCase();const os=s.includes('iphone')?'iPhone':s.includes('ipad')?'iPad':s.includes('android')?'Android':s.includes('windows')?'Windows':s.includes('macintosh')||s.includes('mac os')?'Mac':s.includes('linux')?'Linux':'Appareil';const browser=s.includes('edg/')?'Edge':s.includes('chrome/')&&!s.includes('edg/')?'Chrome':s.includes('firefox/')?'Firefox':s.includes('safari/')&&!s.includes('chrome/')?'Safari':'Navigateur';return `${os} · ${browser}`;}

export async function recordSessionMetadata(sessionId:string,req?:Request,mfaMethod?:string|null){const ua=(req?.headers.get('user-agent')||'').slice(0,500);const now=new Date().toISOString();const value={device:deviceLabel(ua),userAgent:ua||null,ipFingerprint:ipFingerprint(ipFromRequest(req)),createdAt:now,lastSeenAt:now,mfaVerifiedAt:mfaMethod?now:null,mfaMethod:mfaMethod||null,passwordReauthAt:null};await db.appSetting.upsert({where:{key:`${PREFIX}${sessionId}`},create:{key:`${PREFIX}${sessionId}`,category:CATEGORY,value,isSecret:true,updatedBy:'AUTH'},update:{value,isSecret:true,updatedBy:'AUTH'}}).catch(()=>{});}

export async function currentSessionId(){const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;if(!token)return null;const row=await db.portalSession.findUnique({where:{tokenHash:tokenHash(token)},select:{id:true}});return row?.id||null;}

export async function markCurrentSessionMfaVerified(method:string){const sessionId=await currentSessionId();if(!sessionId)throw new Error('current_session_not_found');const key=`${PREFIX}${sessionId}`;const row=await db.appSetting.findUnique({where:{key}});const current=(row?.value as any)||{};const now=new Date().toISOString();await db.appSetting.upsert({where:{key},create:{key,category:CATEGORY,value:{...current,mfaVerifiedAt:now,mfaMethod:method,lastSeenAt:now},isSecret:true,updatedBy:'AUTH_STEP_UP'},update:{value:{...current,mfaVerifiedAt:now,mfaMethod:method,lastSeenAt:now},isSecret:true,updatedBy:'AUTH_STEP_UP'}});return now;}

export async function markCurrentSessionPasswordReauth(){const sessionId=await currentSessionId();if(!sessionId)throw new Error('current_session_not_found');const key=`${PREFIX}${sessionId}`;const row=await db.appSetting.findUnique({where:{key}});const current=(row?.value as any)||{};const now=new Date().toISOString();await db.appSetting.upsert({where:{key},create:{key,category:CATEGORY,value:{...current,passwordReauthAt:now,lastSeenAt:now},isSecret:true,updatedBy:'AUTH_PASSWORD_REAUTH'},update:{value:{...current,passwordReauthAt:now,lastSeenAt:now},isSecret:true,updatedBy:'AUTH_PASSWORD_REAUTH'}});return now;}

export async function hasRecentStepUp(){const sessionId=await currentSessionId();if(!sessionId)return false;const row=await db.appSetting.findUnique({where:{key:`${PREFIX}${sessionId}`}});const v=row?.value as any;const at=v?.mfaVerifiedAt?new Date(v.mfaVerifiedAt).getTime():0;return Boolean(at&&Date.now()-at<=STEP_UP_WINDOW_MS);}

export async function hasRecentPasswordReauth(){const sessionId=await currentSessionId();if(!sessionId)return false;const row=await db.appSetting.findUnique({where:{key:`${PREFIX}${sessionId}`}});const v=row?.value as any;const at=v?.passwordReauthAt?new Date(v.passwordReauthAt).getTime():0;return Boolean(at&&Date.now()-at<=PASSWORD_REAUTH_WINDOW_MS);}

export async function requireRecentStepUp(){if(!(await hasRecentStepUp()))return {ok:false as const,status:428,error:'step_up_required',windowSeconds:Math.floor(STEP_UP_WINDOW_MS/1000)};return {ok:true as const};}
export async function requireRecentPasswordReauth(){if(!(await hasRecentPasswordReauth()))return {ok:false as const,status:428,error:'password_reauth_required',windowSeconds:Math.floor(PASSWORD_REAUTH_WINDOW_MS/1000)};return {ok:true as const};}

export async function listUserSessions(userId:string){const currentId=await currentSessionId();const sessions=await db.portalSession.findMany({where:{userId,expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'},select:{id:true,createdAt:true,expiresAt:true}});const metaRows=sessions.length?await db.appSetting.findMany({where:{key:{in:sessions.map(s=>`${PREFIX}${s.id}`)}}}):[];const meta=new Map(metaRows.map(r=>[r.key.replace(PREFIX,''),r.value as any]));return sessions.map(s=>{const m=meta.get(s.id);return{id:s.id,current:s.id===currentId,createdAt:s.createdAt.toISOString(),expiresAt:s.expiresAt.toISOString(),device:String(m?.device||'Appareil inconnu'),lastSeenAt:m?.lastSeenAt||null,ipFingerprint:m?.ipFingerprint||null,mfaVerifiedAt:m?.mfaVerifiedAt||null,mfaMethod:m?.mfaMethod||null};});}

export async function revokeUserSession(userId:string,sessionId:string){const currentId=await currentSessionId();if(sessionId===currentId)throw new Error('cannot_revoke_current_session_here');const result=await db.portalSession.deleteMany({where:{id:sessionId,userId}});if(!result.count)throw new Error('session_not_found');await db.appSetting.deleteMany({where:{key:`${PREFIX}${sessionId}`}}).catch(()=>{});return true;}

export async function revokeOtherSessions(userId:string){const currentId=await currentSessionId();if(!currentId)throw new Error('current_session_not_found');const rows=await db.portalSession.findMany({where:{userId,id:{not:currentId}},select:{id:true}});await db.portalSession.deleteMany({where:{userId,id:{not:currentId}}});if(rows.length)await db.appSetting.deleteMany({where:{key:{in:rows.map(r=>`${PREFIX}${r.id}`)}}}).catch(()=>{});return rows.length;}
