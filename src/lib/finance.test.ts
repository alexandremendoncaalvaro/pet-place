import { describe, expect, it } from 'vitest';
import { buildCashLedger, calculateCashSummary } from './finance';
import { Expense, Payment } from './types';

const basePayment: Payment = {
  id: 'payment-1',
  familyId: 'family-1',
  month: '2026-05',
  amount: 25,
  proofUrl: '/proofs/1',
  status: 'approved',
  type: 'mensalidade',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  userName: 'Bruna',
};

const baseExpense: Expense = {
  id: 'expense-1',
  date: '2026-05-02',
  title: 'Tadeu roçou o terreno',
  category: 'Geral',
  amount: 150,
  receiptUrl: '/receipts/1',
  createdBy: 'admin-1',
  createdAt: '2026-05-02T10:00:00.000Z',
};

describe('cash summary', () => {
  it('uses only approved payments as entradas', () => {
    const payments: Payment[] = [
      basePayment,
      { ...basePayment, id: 'payment-2', amount: 50, status: 'pending' },
      { ...basePayment, id: 'payment-3', amount: 75, status: 'rejected' },
    ];

    expect(calculateCashSummary(payments, [baseExpense])).toEqual({
      totalEntradas: 25,
      totalSaidas: 150,
      saldo: -125,
    });
  });
});

describe('cash ledger', () => {
  it('builds a single transparent history with entradas and saidas sorted by date', () => {
    const ledger = buildCashLedger(
      [
        basePayment,
        {
          ...basePayment,
          id: 'donation-1',
          amount: 50,
          type: 'doacao',
          description: 'Ajuda extra',
          updatedAt: '2026-05-03T12:00:00.000Z',
        },
      ],
      [baseExpense],
    );

    expect(ledger.map((item) => item.id)).toEqual(['payment-donation-1', 'expense-expense-1', 'payment-payment-1']);
    expect(ledger[0]).toMatchObject({
      kind: 'entrada',
      title: 'Doação',
      subtitle: 'Bruna - Ajuda extra',
      amount: 50,
    });
    expect(ledger[1]).toMatchObject({
      kind: 'saida',
      title: 'Tadeu roçou o terreno',
      subtitle: 'Geral',
      amount: 150,
    });
  });
});
