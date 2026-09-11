import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/settings/service', () => ({ getSetting: vi.fn(async () => null) }));

import { verifyStripe } from '@/services/payments/webhooks';

const secret = 'whsec_test';
const sign = (raw: string, t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;

describe('verifyStripe', () => {
  it('accepts a valid, recent signature', () => {
    expect(verifyStripe('{"id":"evt_1"}', sign('{"id":"evt_1"}'), secret)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifyStripe('{"id":"evt_2"}', sign('{"id":"evt_1"}'), secret)).toBe(false);
  });
  it('rejects replays older than 5 minutes', () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(verifyStripe('{}', sign('{}', old), secret)).toBe(false);
  });
  it('rejects missing header or secret', () => {
    expect(verifyStripe('{}', null, secret)).toBe(false);
    expect(verifyStripe('{}', sign('{}'), '')).toBe(false);
  });
});
