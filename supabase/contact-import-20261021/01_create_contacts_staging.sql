-- Run in the Makueni project's Supabase SQL Editor as postgres.
-- Confirm this is the same project used by the Render app's DATABASE_URL.
-- Then import makueni_combined_contacts_full.csv into this staging table.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.voter_registry') IS NULL THEN
    RAISE EXCEPTION 'voter_registry is missing. Select the database used by the Makueni application.';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.makueni_contacts_stage_20261021 (
  full_name text,
  phone text PRIMARY KEY,
  ward text,
  constituency text,
  source_files text,
  source_rows text,
  review_notes text,
  alternate_names text,
  source_constituencies text,
  source_wards text,
  import_state text NOT NULL DEFAULT 'loaded',
  registry_id integer,
  import_message text,
  processed_at timestamptz
);
ALTER TABLE public.makueni_contacts_stage_20261021 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.makueni_contacts_stage_20261021 FROM PUBLIC, anon, authenticated;
COMMIT;
SELECT count(*) AS uploaded_rows, 126445 AS expected_rows
FROM public.makueni_contacts_stage_20261021;
