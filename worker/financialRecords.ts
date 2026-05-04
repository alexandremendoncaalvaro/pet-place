import { mediaUrl } from './media';

type PaymentRow = {
  id: string;
  family_id: string;
  month: string;
  amount: number;
  proof_key?: string | null;
  proof_url?: string | null;
  status: string;
  type?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_dog?: string | null;
};

type ExpenseRow = {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  receipt_key?: string | null;
  receipt_url?: string | null;
  created_by: string;
  created_at: string;
};

export type FinancialMediaOptions = {
  includeProofs?: boolean;
  includeReceipts?: boolean;
};

export function serializePayment(row: PaymentRow, options: FinancialMediaOptions = {}) {
  return {
    id: row.id,
    familyId: row.family_id,
    month: row.month,
    amount: row.amount,
    proofUrl: options.includeProofs ? mediaUrl(row.proof_key, row.proof_url) : '',
    status: row.status,
    type: row.type || undefined,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name || undefined,
    userDog: row.user_dog || undefined,
  };
}

export function serializeExpense(row: ExpenseRow, options: FinancialMediaOptions = {}) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    category: row.category,
    amount: row.amount,
    receiptUrl: options.includeReceipts ? mediaUrl(row.receipt_key, row.receipt_url) : '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
