import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, any>();
vi.mock('@/lib/db', () => ({
  db: {
    appSetting: {
      findUnique: vi.fn(async ({ where }: any) =>
        store.has(where.key) ? { value: store.get(where.key) } : null,
      ),
      upsert: vi.fn(async ({ where, create }: any) => {
        store.set(where.key, create.value);
        return create;
      }),
    },
  },
}));
const settings = new Map<string, any>();
vi.mock('@/lib/settings/service', () => ({
  getSetting: vi.fn(async (k: string) => settings.get(k) ?? null),
}));

import { convertCurrency } from '@/services/payments/fx';

const table = (fetchedAt: string) => ({
  rates: { MXN: 18.5, HTG: 131.2 },
  fetchedAt,
  source: 'OpenExchangeRates',
});

describe('convertCurrency', () => {
  beforeEach(() => {
    store.clear();
    settings.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('same currency needs nothing', async () => {
    expect(await convertCurrency(100, 'usd', 'USD')).toMatchObject({ amount: 100, rate: 1 });
  });

  it('manual env rate wins (emergency override)', async () => {
    vi.stubEnv('FX_USD_HTG', '130');
    expect(await convertCurrency(10, 'USD', 'HTG')).toMatchObject({ amount: 1300, source: 'env_manual' });
  });

  it('refuses rather than guessing when no key and no cache', async () => {
    expect(await convertCurrency(10, 'USD', 'MXN')).toBeNull();
  });

  it('uses the fresh cache without calling the API', async () => {
    store.set('fx.rates_cache', table(new Date().toISOString()));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const r = await convertCurrency(10, 'USD', 'MXN');
    expect(r?.amount).toBe(185);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refreshes after 6h and stores the new table', async () => {
    store.set('fx.rates_cache', table(new Date(Date.now() - 7 * 3600_000).toISOString()));
    settings.set('fx.openexchangerates_app_id', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ rates: { MXN: 20, HTG: 132 } }) })),
    );
    const r = await convertCurrency(10, 'USD', 'MXN');
    expect(r?.amount).toBe(200);
    expect(store.get('fx.rates_cache').rates.MXN).toBe(20);
  });

  it('falls back to a stale (<48h) cache when the API fails', async () => {
    store.set('fx.rates_cache', table(new Date(Date.now() - 20 * 3600_000).toISOString()));
    settings.set('fx.openexchangerates_app_id', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const r = await convertCurrency(10, 'USD', 'HTG');
    expect(r?.amount).toBe(1312);
    expect(r?.source).toContain('cache');
  });

  it('never quotes from a cache older than 48h', async () => {
    store.set('fx.rates_cache', table(new Date(Date.now() - 60 * 3600_000).toISOString()));
    settings.set('fx.openexchangerates_app_id', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    expect(await convertCurrency(10, 'USD', 'HTG')).toBeNull();
  });

  it('cross rates go through USD', async () => {
    store.set('fx.rates_cache', table(new Date().toISOString()));
    const r = await convertCurrency(185, 'MXN', 'USD');
    expect(r?.amount).toBe(10);
  });
});
