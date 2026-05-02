CREATE TABLE IF NOT EXISTS post_tags_new (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

INSERT OR IGNORE INTO post_tags_new (post_id, user_id)
SELECT post_id, user_id FROM post_tags;

DROP TABLE post_tags;

ALTER TABLE post_tags_new RENAME TO post_tags;
