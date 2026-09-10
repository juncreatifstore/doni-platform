import { describe, expect, it } from 'vitest';
import { parsePassengerCounts } from '@/services/segments/passengers';

describe('parsePassengerCounts', () => {
  it('plain numbers and solo expressions', () => {
    expect(parsePassengerCounts('2')).toEqual({ adults: 2, children: 0, infants: 0 });
    expect(parsePassengerCounts('mwen sèl')).toEqual({ adults: 1, children: 0, infants: 0 });
    expect(parsePassengerCounts('0')).toBeNull();
    expect(parsePassengerCounts('12')).toBeNull();
  });
  it('mixed adults / children / infants in four languages', () => {
    expect(parsePassengerCounts('2 adultes 1 enfant')).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(parsePassengerCounts('2 adultos, 1 niño, 1 bebé')).toEqual({ adults: 2, children: 1, infants: 1 });
    expect(parsePassengerCounts('3 granmoun 2 timoun')).toEqual({ adults: 3, children: 2, infants: 0 });
    expect(parsePassengerCounts('1 adult 1 infant')).toEqual({ adults: 1, children: 0, infants: 1 });
  });
  it('rejects text without any count', () => {
    expect(parsePassengerCounts('bonjour')).toBeNull();
  });
});
