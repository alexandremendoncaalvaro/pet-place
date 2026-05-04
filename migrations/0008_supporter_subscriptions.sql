CREATE TABLE IF NOT EXISTS supporter_subscriptions (
  family_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused')),
  active_since_month TEXT,
  paused_at TEXT,
  source TEXT NOT NULL DEFAULT 'migration' CHECK (source IN ('migration', 'self', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supporter_subscriptions_status ON supporter_subscriptions (status);

INSERT OR IGNORE INTO supporter_subscriptions (
  family_id,
  status,
  active_since_month,
  paused_at,
  source,
  created_at,
  updated_at
)
SELECT DISTINCT
  COALESCE(NULLIF(family_id, ''), id),
  'active',
  strftime('%Y-%m', 'now'),
  NULL,
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE user_status != 'blocked';

INSERT OR IGNORE INTO supporter_subscriptions (
  family_id,
  status,
  active_since_month,
  paused_at,
  source,
  created_at,
  updated_at
)
SELECT DISTINCT
  family_id,
  'active',
  COALESCE(MIN(month), strftime('%Y-%m', 'now')),
  NULL,
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM payments
WHERE type IS NULL OR type = 'mensalidade'
GROUP BY family_id;
