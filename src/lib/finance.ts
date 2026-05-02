import { Expense, Payment } from './types';

export type CashLedgerItem = {
  id: string;
  kind: 'entrada' | 'saida';
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  proofUrl?: string;
};

export type CashSummary = {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
};

export function calculateCashSummary(payments: Payment[], expenses: Expense[]): CashSummary {
  const totalEntradas = payments
    .filter((payment) => payment.status === 'approved')
    .reduce((acc, payment) => acc + payment.amount, 0);
  const totalSaidas = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  return {
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
  };
}

export function buildCashLedger(payments: Payment[], expenses: Expense[]): CashLedgerItem[] {
  const entradas = payments
    .filter((payment) => payment.status === 'approved')
    .map((payment) => ({
      id: `payment-${payment.id}`,
      kind: 'entrada' as const,
      title: getPaymentTitle(payment),
      subtitle: [payment.userName || 'Morador', payment.description].filter(Boolean).join(' - '),
      date: payment.updatedAt || payment.createdAt,
      amount: payment.amount,
      proofUrl: payment.proofUrl,
    }));

  const saidas = expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    kind: 'saida' as const,
    title: expense.title,
    subtitle: expense.category,
    date: expense.date,
    amount: expense.amount,
    proofUrl: expense.receiptUrl,
  }));

  return [...entradas, ...saidas].sort((a, b) => sortableDate(b.date).localeCompare(sortableDate(a.date)));
}

function getPaymentTitle(payment: Payment): string {
  if (payment.type === 'doacao') return 'Doação';
  if (payment.type === 'rateio') return 'Rateio';
  return 'Mensalidade';
}

function sortableDate(value: string): string {
  return value.includes('T') ? value : `${value}T00:00:00.000Z`;
}
