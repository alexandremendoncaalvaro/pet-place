ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE notifications ADD COLUMN actor_id TEXT;
ALTER TABLE notifications ADD COLUMN entity_type TEXT;
ALTER TABLE notifications ADD COLUMN entity_id TEXT;
ALTER TABLE notifications ADD COLUMN aggregation_key TEXT;
ALTER TABLE notifications ADD COLUMN count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notifications ADD COLUMN data_json TEXT;
ALTER TABLE notifications ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_aggregation ON notifications (user_id, aggregation_key, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications (entity_type, entity_id);
