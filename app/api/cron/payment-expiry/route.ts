import { db } from '../../../../lib/db';
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  const now = new Date();
  const r = await db.payment.updateMany({
    where: { status: { in: ['CREATED', 'PENDING'] }, expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  // Heartbeat read by /api/health: proves the scheduler is alive.
  await db.appSetting
    .upsert({
      where: { key: 'ops.cron.last_run' },
      create: { key: 'ops.cron.last_run', category: 'ops', value: now.toISOString() },
      update: { value: now.toISOString() },
    })
    .catch(() => null);
  return Response.json({ ok: true, expired: r.count, at: now.toISOString() });
}
