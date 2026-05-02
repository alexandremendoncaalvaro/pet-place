ALTER TABLE users ADD COLUMN is_offline INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS identity_link_suggestions (
  id TEXT PRIMARY KEY,
  source_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_identity_link_status ON identity_link_suggestions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_link_source ON identity_link_suggestions (source_user_id);
CREATE INDEX IF NOT EXISTS idx_identity_link_target ON identity_link_suggestions (target_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_link_pending_unique ON identity_link_suggestions (source_user_id, target_user_id, status);
