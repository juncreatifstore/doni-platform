import { describe, expect, it } from 'vitest';
import { detectIntent } from '@/services/conversation/intent-engine';
import { detectLanguage } from '@/services/conversation/language-engine';

describe('detectIntent', () => {
  it('flight in each language', () => {
    expect(detectIntent('je veux un vol pour miami')).toBe('flight');
    expect(detectIntent('quiero un vuelo a cancún')).toBe('flight');
    expect(detectIntent('mwen bezwen yon tikèt avyon')).toBe('flight');
    expect(detectIntent('I need a plane ticket')).toBe('flight');
  });
  it('agent / greeting / unknown', () => {
    expect(['agent', 'unknown']).toContain(detectIntent('parler à un agent'));
    expect(detectIntent('bonjour')).toBe('greeting');
    expect(detectIntent('xyzzy')).toBe('unknown');
  });
});

describe('detectLanguage', () => {
  it('classifies the four languages and ignores numbers', () => {
    expect(detectLanguage('bonjour je voudrais partir demain')).toBe('fr');
    expect(detectLanguage('hola quiero viajar mañana')).toBe('es');
    expect(detectLanguage('bonjou mwen vle vwayaje demen')).toBe('ht');
    expect(detectLanguage('hello I would like to travel tomorrow')).toBe('en');
    expect(detectLanguage('12345')).toBeNull();
  });
});
