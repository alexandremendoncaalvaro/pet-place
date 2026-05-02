UPDATE payments
SET type = 'mensalidade'
WHERE type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_monthly_family_month
ON payments (family_id, month)
WHERE type = 'mensalidade';
