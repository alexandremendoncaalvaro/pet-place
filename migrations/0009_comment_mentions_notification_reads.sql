CREATE TABLE IF NOT EXISTS post_comment_tags (
  comment_id TEXT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_tags_target ON post_comment_tags (target_id);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads (user_id, read_at DESC);

INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at)
SELECT n.id, u.id, COALESCE(n.updated_at, n.created_at)
FROM notifications n
JOIN users u ON u.user_status != 'blocked'
WHERE n.is_read = 1
  AND (
    n.user_id = 'all'
    OR (n.user_id = 'admins' AND u.role = 'admin')
  );
