import { describe, expect, it } from 'vitest';
import { canAccessMediaReference } from './security';

const resident = { uid: 'user-1', familyId: 'family-1', role: 'resident' as const };
const admin = { uid: 'admin-1', role: 'admin' as const };

describe('media access policy', () => {
  it('allows residents to access payment proofs from their family', () => {
    expect(canAccessMediaReference(resident, { kind: 'payment-proof', familyId: 'family-1' })).toBe(true);
  });

  it('denies residents access to payment proofs from another family', () => {
    expect(canAccessMediaReference(resident, { kind: 'payment-proof', familyId: 'family-2' })).toBe(false);
  });

  it('allows admins to access registered financial media', () => {
    expect(canAccessMediaReference(admin, { kind: 'payment-proof', familyId: 'family-2' })).toBe(true);
    expect(canAccessMediaReference(admin, { kind: 'expense-receipt' })).toBe(true);
  });

  it('denies residents access to expense receipts', () => {
    expect(canAccessMediaReference(resident, { kind: 'expense-receipt' })).toBe(false);
  });

  it('allows authenticated users to access public application media', () => {
    expect(canAccessMediaReference(resident, { kind: 'public-media' })).toBe(true);
    expect(canAccessMediaReference(admin, { kind: 'public-media' })).toBe(true);
  });

  it('denies media keys that are not tied to a known application object', () => {
    expect(canAccessMediaReference(resident, { kind: 'unknown' })).toBe(false);
    expect(canAccessMediaReference(admin, { kind: 'unknown' })).toBe(false);
  });
});
