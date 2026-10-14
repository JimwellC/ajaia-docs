-- Block-level cursor indicators: the top-level block index holding each user's selection, null when not focused.
ALTER TABLE document_presence ADD COLUMN IF NOT EXISTS cursor_block INTEGER NULL;
