-- Presence: who has a document open, refreshed by each client's poll (heartbeat), and whether they are typing.
CREATE TABLE IF NOT EXISTS document_presence (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  typing_at   TIMESTAMPTZ NULL,
  PRIMARY KEY (document_id, user_id)
);
