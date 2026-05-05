import { describe, expect, it } from 'vitest';
import { getSupporterStartMonth, isFamilyActiveSupporter, isSupporterActiveForMonth } from './supporters';

describe('supporter subscription rules', () => {
  it('starts in the current month when activation happens on or before the due day', () => {
    expect(getSupporterStartMonth(new Date(2026, 4, 10), 10)).toBe('2026-05');
  });

  it('starts in the next month when activation happens after the due day', () => {
    expect(getSupporterStartMonth(new Date(2026, 4, 11), 10)).toBe('2026-06');
  });

  it('treats paused or future subscriptions as inactive for the current month', () => {
    expect(isSupporterActiveForMonth({ familyId: 'family-1', status: 'paused', source: 'self', createdAt: '', updatedAt: '' }, '2026-05')).toBe(false);
    expect(isSupporterActiveForMonth({ familyId: 'family-1', status: 'active', activeSinceMonth: '2026-06', source: 'self', createdAt: '', updatedAt: '' }, '2026-05')).toBe(false);
    expect(isSupporterActiveForMonth({ familyId: 'family-1', status: 'active', activeSinceMonth: '2026-05', source: 'self', createdAt: '', updatedAt: '' }, '2026-05')).toBe(true);
  });

  it('finds active families in public supporter lists', () => {
    expect(isFamilyActiveSupporter([
      { familyId: 'family-a', status: 'active', activeSinceMonth: '2026-04', source: 'self', createdAt: '', updatedAt: '' },
      { familyId: 'family-b', status: 'paused', source: 'self', createdAt: '', updatedAt: '' },
    ], 'family-a', '2026-05')).toBe(true);
    expect(isFamilyActiveSupporter([], 'family-a', '2026-05')).toBe(false);
  });
});
