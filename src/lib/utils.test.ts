import { describe, expect, it } from 'vitest';
import { formatPhoneBR, normalizePhoneBR } from './utils';

describe('phone helpers', () => {
  it('normalizes Brazilian mobile numbers to digits without country code', () => {
    expect(normalizePhoneBR('(47) 99999-9999')).toBe('47999999999');
    expect(normalizePhoneBR('+55 47 99999-9999')).toBe('47999999999');
  });

  it('formats Brazilian mobile numbers for display', () => {
    expect(formatPhoneBR('47999999999')).toBe('(47) 99999-9999');
  });

  it('keeps partial input usable while typing', () => {
    expect(formatPhoneBR('47')).toBe('(47');
    expect(formatPhoneBR('479999')).toBe('(47) 9999');
  });
});
