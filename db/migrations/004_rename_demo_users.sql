-- Rename the demo users: u_alice → u_jimwell, u_bob → u_jim, u_carol → u_jc.
-- scripts/migrate.ts applies this file inside one transaction, so it applies completely or not at all.
-- Safe on a database that has the old users and on a fresh one: each statement does nothing
-- when there is nothing to move.

-- 1. The new users.
INSERT INTO users (id, email, name) VALUES
  ('u_jimwell', 'jimwell@ajaia.test', 'Jimwell Calma'),
  ('u_jim', 'jim@ajaia.test', 'Jim'),
  ('u_jc', 'jc@ajaia.test', 'JC')
ON CONFLICT DO NOTHING;

-- 2. Move ownership, shares, and sessions from each old user to the new one.
UPDATE documents d
   SET owner_id = m.new_id
  FROM (VALUES ('u_alice', 'u_jimwell'), ('u_bob', 'u_jim'), ('u_carol', 'u_jc')) AS m(old_id, new_id)
 WHERE d.owner_id = m.old_id;

-- Skip a share the new user already has, or one on a document the new user owns
-- (those leftovers are removed with the old user below).
UPDATE shares s
   SET user_id = m.new_id
  FROM (VALUES ('u_alice', 'u_jimwell'), ('u_bob', 'u_jim'), ('u_carol', 'u_jc')) AS m(old_id, new_id)
 WHERE s.user_id = m.old_id
   AND NOT EXISTS (SELECT 1 FROM shares x WHERE x.document_id = s.document_id AND x.user_id = m.new_id)
   AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = s.document_id AND d.owner_id = m.new_id);

UPDATE sessions s
   SET user_id = m.new_id
  FROM (VALUES ('u_alice', 'u_jimwell'), ('u_bob', 'u_jim'), ('u_carol', 'u_jc')) AS m(old_id, new_id)
 WHERE s.user_id = m.old_id;

-- 3. Remove the old users (anything still pointing at them cascades).
DELETE FROM users WHERE id IN ('u_alice', 'u_bob', 'u_carol');
