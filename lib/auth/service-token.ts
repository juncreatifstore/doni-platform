import { timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getUserDepartment } from '@/lib/auth/departments';
import { getUserOrgRole } from '@/lib/auth/org-roles';
import { safeUser, type SafeUser } from '@/lib/auth/session';

/**
 * Machine-to-machine authentication for the phase runbooks (GitHub Actions).
 *
 * Human accounts require a passkey for privileged roles, which a script cannot
 * satisfy. Instead, automation presents `Authorization: Bearer <RUNBOOK_TOKEN>`
 * and acts as the dedicated service account (username RUNBOOK_USERNAME,
 * default "runbook"), which an administrator creates once in the portal.
 *
 * The token is the strong factor: ≥ 32 random bytes, stored only in Vercel and
 * in the GitHub repository secrets. Every action is audited under the service
 * account's user id. Disable instantly by unsetting RUNBOOK_TOKEN or
 * deactivating the user.
 */
export async function serviceTokenUser(): Promise<SafeUser | null> {
  const expected = process.env.RUNBOOK_TOKEN;
  if (!expected || expected.length < 32) return null;
  let auth: string | null = null;
  try {
    auth = (await headers()).get('authorization');
  } catch {
    return null;
  }
  if (!auth?.startsWith('Bearer ')) return null;
  const presented = auth.slice(7).trim();
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const username = (process.env.RUNBOOK_USERNAME || 'runbook').toLowerCase();
  const user = await db.portalUser.findUnique({ where: { username } });
  if (!user || !user.active) return null;
  const [department, orgRole] = await Promise.all([
    getUserDepartment(user.id),
    getUserOrgRole(user.id, user.role),
  ]);
  return safeUser(user, department, orgRole);
}

/** True when the current request is authenticated by the service token. */
export async function isServiceTokenRequest() {
  return Boolean(await serviceTokenUser());
}

/** Username/password form of the same mechanism, used by the login route. */
export function isServiceAccountLogin(username: string, password: string) {
  const expected = process.env.RUNBOOK_TOKEN;
  if (!expected || expected.length < 32) return false;
  if (username.toLowerCase() !== (process.env.RUNBOOK_USERNAME || 'runbook').toLowerCase()) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
