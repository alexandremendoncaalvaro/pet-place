export type AccessRole = 'admin' | 'resident';

export type AccessUser = {
  uid: string;
  role: AccessRole;
  familyId?: string;
};

export type MediaAccessReference =
  | { kind: 'payment-proof'; familyId: string }
  | { kind: 'expense-receipt' }
  | { kind: 'public-media' }
  | { kind: 'unknown' };

export function accessFamilyId(user: AccessUser): string {
  return user.familyId || user.uid;
}

export function canAccessMediaReference(user: AccessUser, reference: MediaAccessReference): boolean {
  if (reference.kind === 'unknown') return false;
  if (reference.kind === 'public-media') return true;
  if (reference.kind === 'expense-receipt') return user.role === 'admin';
  if (reference.kind === 'payment-proof') return user.role === 'admin' || reference.familyId === accessFamilyId(user);
  return false;
}
