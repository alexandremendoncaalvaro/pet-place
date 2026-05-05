import type { SupporterSubscription } from './types';

export function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function addMonths(month: string, count: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, (monthIndex || 1) - 1 + count, 1);
  return monthKey(date);
}

export function getSupporterStartMonth(date: Date, dueDateDay: number): string {
  const dueDay = Math.max(1, Math.min(31, Math.floor(dueDateDay || 1)));
  const currentMonth = monthKey(date);
  return date.getDate() <= dueDay ? currentMonth : addMonths(currentMonth, 1);
}

export function isSupporterActiveForMonth(subscription: SupporterSubscription | null | undefined, month: string): boolean {
  if (!subscription || subscription.status !== 'active') return false;
  return !subscription.activeSinceMonth || subscription.activeSinceMonth <= month;
}

export function isFamilyActiveSupporter(supporters: SupporterSubscription[], familyId: string | undefined, month = monthKey(new Date())): boolean {
  if (!familyId) return false;
  return supporters.some((supporter) => supporter.familyId === familyId && isSupporterActiveForMonth(supporter, month));
}
