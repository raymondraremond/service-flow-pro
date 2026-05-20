ALTER TABLE presentation_sessions ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE presentation_state ADD COLUMN IF NOT EXISTS overlay jsonb NOT NULL DEFAULT '{}'::jsonb;