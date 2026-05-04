import { describe, expect, it } from 'vitest';
import { serializeExpense, serializePayment } from './financialRecords';

const paymentRow = {
  id: 'payment-1',
  family_id: 'family-1',
  month: '2026-05',
  amount: 25,
  proof_key: 'proofs/payment-1.pdf',
  proof_url: '',
  status: 'approved',
  type: 'mensalidade',
  description: null,
  created_at: '2026-05-01T10:00:00.000Z',
  updated_at: '2026-05-01T10:00:00.000Z',
  user_name: 'Bruna',
  user_dog: 'Tina',
};

const expenseRow = {
  id: 'expense-1',
  date: '2026-05-02',
  title: 'Rocada do terreno',
  category: 'Geral',
  amount: 150,
  receipt_key: 'receipts/expense-1.pdf',
  receipt_url: '',
  created_by: 'admin-1',
  created_at: '2026-05-02T10:00:00.000Z',
};

describe('financial record serialization', () => {
  it('redacts payment proofs unless explicitly included', () => {
    expect(serializePayment(paymentRow).proofUrl).toBe('');
    expect(serializePayment(paymentRow, { includeProofs: true }).proofUrl).toBe('/api/media/proofs/payment-1.pdf');
  });

  it('redacts expense receipts unless explicitly included', () => {
    expect(serializeExpense(expenseRow).receiptUrl).toBe('');
    expect(serializeExpense(expenseRow, { includeReceipts: true }).receiptUrl).toBe('/api/media/receipts/expense-1.pdf');
  });

  it('keeps legacy external media URLs only when private media is allowed', () => {
    expect(serializePayment({ ...paymentRow, proof_key: null, proof_url: 'https://example.test/proof.pdf' }).proofUrl).toBe('');
    expect(serializePayment({ ...paymentRow, proof_key: null, proof_url: 'https://example.test/proof.pdf' }, { includeProofs: true }).proofUrl).toBe('https://example.test/proof.pdf');
  });
});
