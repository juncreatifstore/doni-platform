import { getSetting } from '@/lib/settings/service';
import { db } from '@/lib/db';
export interface FxResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  source: string;
  timestamp: string;
}
function envRate(from: string, to: string) {
  const v = process.env[`FX_${from}_${to}`];
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
export async function convertCurrency(
  amount: number,
  fromRaw: string,
  toRaw: string,
): Promise<FxResult | null> {
  const from = fromRaw.toUpperCase(),
    to = toRaw.toUpperCase();
  if (from === to)
    return {
      amount: Math.round(amount * 100) / 100,
      from,
      to,
      rate: 1,
      source: 'same_currency',
      timestamp: new Date().toISOString(),
    };
  const manual = envRate(from, to);
  if (manual)
    return {
      amount: Math.round(amount * manual * 100) / 100,
      from,
      to,
      rate: manual,
      source: 'env_manual',
      timestamp: new Date().toISOString(),
    };
  const rates = await latestRates();
  if (!rates) return null;
  const usdFrom = from === 'USD' ? 1 : Number(rates.rates[from]);
  const usdTo = to === 'USD' ? 1 : Number(rates.rates[to]);
  if (!usdFrom || !usdTo) return null;
  const rate = usdTo / usdFrom;
  return {
    amount: Math.round(amount * rate * 100) / 100,
    from,
    to,
    rate,
    source: rates.source,
    timestamp: rates.fetchedAt,
  };
}

/* ───────────── Rate cache ─────────────
 * OpenExchangeRates' free plan allows 1 000 calls/month and quotes are only
 * refreshed hourly upstream, so we keep the table in AppSetting:
 *   - fresh for 6 h → no call
 *   - between 6 h and 48 h → refresh, but fall back to the cached table if the API fails
 *   - beyond 48 h → refuse rather than quote a stale price
 */
const CACHE_KEY = 'fx.rates_cache';
const FRESH_MS = 6 * 60 * 60 * 1000;
const STALE_MAX_MS = 48 * 60 * 60 * 1000;

type RateTable = { rates: Record<string, number>; fetchedAt: string; source: string };

async function readCache(): Promise<RateTable | null> {
  try {
    const row: any = await (db as any).appSetting.findUnique({ where: { key: CACHE_KEY } });
    const v = row?.value as RateTable | undefined;
    return v && v.rates && v.fetchedAt ? v : null;
  } catch {
    return null;
  }
}

async function writeCache(table: RateTable) {
  try {
    await (db as any).appSetting.upsert({
      where: { key: CACHE_KEY },
      create: { key: CACHE_KEY, category: 'FX', value: table },
      update: { value: table },
    });
  } catch {
    /* cache is best effort */
  }
}

async function fetchRates(key: string): Promise<RateTable | null> {
  try {
    const r = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(key)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json();
    if (!r.ok || !j?.rates) return null;
    return { rates: j.rates, fetchedAt: new Date().toISOString(), source: 'OpenExchangeRates' };
  } catch {
    return null;
  }
}

export async function latestRates(): Promise<RateTable | null> {
  const cached = await readCache();
  const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity;
  if (cached && age < FRESH_MS) return cached;
  const key = await getSetting<string>('fx.openexchangerates_app_id');
  const live = key ? await fetchRates(key) : null;
  if (live) {
    await writeCache(live);
    return live;
  }
  if (cached && age < STALE_MAX_MS) return { ...cached, source: 'OpenExchangeRates (cache)' };
  return null;
}
