import { describe, expect, it } from 'vitest';
import { parseFlightDate, isPastDate, todayIso } from '@/services/flights/date-parser';

describe('parseFlightDate', () => {
  it('numeric day-first for fr/es/ht, month-first for en when ambiguous', () => {
    expect(parseFlightDate('05/07/2027', 'fr')).toBe('2027-07-05');
    expect(parseFlightDate('05/07/2027', 'es')).toBe('2027-07-05');
    expect(parseFlightDate('05/07/2027', 'en')).toBe('2027-05-07');
  });
  it('detects the day when one part exceeds 12 regardless of language', () => {
    expect(parseFlightDate('07/25/2027', 'fr')).toBe('2027-07-25');
    expect(parseFlightDate('25/07/2027', 'en')).toBe('2027-07-25');
  });
  it('expands two-digit years and rejects impossible dates', () => {
    expect(parseFlightDate('25/07/27', 'fr')).toBe('2027-07-25');
    expect(parseFlightDate('31/02/2027', 'fr')).toBeNull();
  });
  it('understands month names in the four languages', () => {
    expect(parseFlightDate('25 juillet 2027', 'fr')).toBe('2027-07-25');
    expect(parseFlightDate('25 de julio de 2027', 'es')).toBe('2027-07-25');
    expect(parseFlightDate('25 july 2027', 'en')).toBe('2027-07-25');
  });
  it('relative words resolve against today', () => {
    expect(parseFlightDate("aujourd'hui", 'fr')).toBe(todayIso());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    expect(parseFlightDate('demen', 'ht')).toBe(iso);
    expect(parseFlightDate('mañana', 'es')).toBe(iso);
  });
  it('returns null for unrelated text', () => {
    expect(parseFlightDate('je veux un vol', 'fr')).toBeNull();
  });
  it('isPastDate compares ISO strings', () => {
    expect(isPastDate('2000-01-01')).toBe(true);
    expect(isPastDate('2999-01-01')).toBe(false);
  });
});
