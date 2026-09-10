import { describe, expect, it, vi } from 'vitest';

// matrix.ts imports the settings service (Prisma) for provider readiness; these tests only cover pure routing.
vi.mock('@/lib/settings/service', () => ({ getSetting: vi.fn(async () => null) }));
import { resolvePaymentCountry, paymentCurrencies, hasCurrencyChoice } from '@/services/payments/matrix';

const session = (waId: string, extra: Record<string, unknown> = {}) =>
  ({ waId, country: null, state: {}, ...extra }) as any;

describe('resolvePaymentCountry', () => {
  it('derives the country from the WhatsApp number', () => {
    expect(resolvePaymentCountry(session('50937000000'))).toBe('HT');
    expect(resolvePaymentCountry(session('5215543578482'))).toBe('MX');
    expect(resolvePaymentCountry(session('18095550000'))).toBe('DO');
    expect(resolvePaymentCountry(session('17863330000'))).toBe('US');
    expect(resolvePaymentCountry(session('639170000000'))).toBe('PH');
    expect(resolvePaymentCountry(session('33612345678'))).toBe('default');
  });
  it('explicit choice wins over the number', () => {
    expect(resolvePaymentCountry(session('50937000000', { state: { payment_country: 'us' } }))).toBe('US');
  });
  it('currencies per country', () => {
    expect(paymentCurrencies('HT')).toEqual(['USD', 'HTG']);
    expect(paymentCurrencies('MX')).toEqual(['MXN']);
    expect(paymentCurrencies('US')).toEqual(['USD']);
    expect(hasCurrencyChoice('HT')).toBe(true);
    expect(hasCurrencyChoice('MX')).toBe(false);
  });
});
