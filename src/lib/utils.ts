import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const PHONE_BR_PLACEHOLDER = '(47) 99999-9999';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhoneBR(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith('55')) return digits.slice(2);
  return digits.slice(0, 11);
}

export function formatPhoneBR(value: string | null | undefined): string {
  const digits = normalizePhoneBR(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
