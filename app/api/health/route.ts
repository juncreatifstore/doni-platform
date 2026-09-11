import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — readiness for uptime monitors and the phase runbooks.
 * Reports dependency status only, never configuration values.
 *   200 ok | 503 degraded
 */
type Check = { ok: boolean; ms?: number; detail?: string };

async function checkDb(): Promise<Check> {
  const start = Date.now();
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);
    return { ok: true, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

async function checkCrons(): Promise<Check> {
  // The payment-expiry cron runs every 5 minutes; a stale heartbeat means crons stopped.
  try {
    const row = await db.appSetting.findUnique({ where: { key: 'ops.cron.last_run' } });
    const at = row?.value ? new Date(String(row.value)) : null;
    if (!at || Number.isNaN(at.getTime())) return { ok: true, detail: 'no heartbeat yet' };
    const ageMin = Math.round((Date.now() - at.getTime()) / 60_000);
    return { ok: ageMin <= 15, detail: `last run ${ageMin} min ago` };
  } catch {
    return { ok: true, detail: 'unknown' };
  }
}

function checkEnv(): Check {
  // Sessions use opaque random tokens stored in DB, so no signing secret is needed for auth.
  const required = ['DATABASE_URL', 'SETTINGS_ENCRYPTION_KEY', 'CRON_SECRET', 'AUTH_MFA_ENCRYPTION_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (!process.env.TICKET_LINK_SECRET && !process.env.AUTH_SECRET) missing.push('TICKET_LINK_SECRET');
  return { ok: missing.length === 0, detail: missing.length ? `missing: ${missing.join(', ')}` : undefined };
}

export async function GET() {
  const [dbCheck, crons] = await Promise.all([checkDb(), checkCrons()]);
  const checks = { db: dbCheck, crons, env: checkEnv() };
  const healthy = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      service: 'doni-platform',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      checks,
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
