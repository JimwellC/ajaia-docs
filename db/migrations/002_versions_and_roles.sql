-- Optimistic concurrency: every successful write bumps the version.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Shares carry a role: viewers can read, editors can also write.
ALTER TABLE shares ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'editor';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shares_role_check') THEN
    ALTER TABLE shares ADD CONSTRAINT shares_role_check CHECK (role IN ('viewer', 'editor'));
  END IF;
END $$;
