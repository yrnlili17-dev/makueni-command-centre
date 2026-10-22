-- Additive migration. Run in the database referenced by Render DATABASE_URL.
BEGIN;
ALTER TABLE public.opinion_polls ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMIT;
