-- Run ONLY AFTER the combined CSV has been uploaded to the staging table.
-- All records are imported, including invalid/conflicting entries with review notes.
-- Existing records are backed up before changes. No voter records are deleted.
-- Existing names/locations are preserved. Uncertain incoming locations remain NULL.
-- New records use 'pending': contact data does not establish IEBC verification.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '50s';
LOCK TABLE public.makueni_contacts_stage_20261021 IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.voter_registry IN SHARE ROW EXCLUSIVE MODE;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.makueni_contacts_stage_20261021) <> 126445 THEN
    RAISE EXCEPTION 'Expected 126445 staging rows. Complete the CSV upload before merging.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.makueni_contacts_stage_20261021
             WHERE source_rows IS NULL OR source_rows !~ '^[0-9]+$') THEN
    RAISE EXCEPTION 'Invalid source_rows. Import the original combined CSV without editing its headers.';
  END IF;
  IF (SELECT sum(source_rows::bigint) FROM public.makueni_contacts_stage_20261021) <> 127816 THEN
    RAISE EXCEPTION 'Source row totals do not match the combined file.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.ke_phone(raw_phone text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH digits AS (
    SELECT regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g') AS p
  ), trimmed AS (
    SELECT CASE WHEN p LIKE '00%' THEN substr(p, 3) ELSE p END AS p FROM digits
  )
  SELECT CASE
    WHEN p ~ '^0[17][0-9]{8}$' THEN '254' || substr(p, 2)
    WHEN p ~ '^[17][0-9]{8}$' THEN '254' || p
    ELSE p END FROM trimmed;
$$;

CREATE TEMP TABLE import_geography(ward text PRIMARY KEY, constituency text) ON COMMIT DROP;
INSERT INTO import_geography VALUES
 ('Kee','Kaiti'), ('Kilungu','Kaiti'), ('Ilima','Kaiti'), ('Ukia','Kaiti'),
 ('Masongaleni','Kibwezi East'), ('Mtito Andei','Kibwezi East'),
 ('Thange','Kibwezi East'), ('Ivingoni/Nzambani','Kibwezi East'),
 ('Makindu','Kibwezi West'), ('Kikumbulyu North','Kibwezi West'),
 ('Kikumbulyu South','Kibwezi West'), ('Nguumo','Kibwezi West'),
 ('Nguu/Masumba','Kibwezi West'), ('Emali/Mulala','Kibwezi West'),
 ('Tulimani','Mbooni'), ('Mbooni','Mbooni'), ('Kithungo/Kitundu','Mbooni'),
 ('Kiteta/Kisau','Mbooni'), ('Kako/Waia','Mbooni'), ('Kalawa','Mbooni'),
 ('Kiima Kiu/Kalanzoni','Kilome'), ('Mukaa','Kilome'), ('Kasikeu','Kilome'),
 ('Nzaui/Kilili/Kalamba','Makueni'), ('Muvau/Kikumini','Makueni'),
 ('Kathonzweni','Makueni'), ('Mavindini','Makueni'), ('Kitise/Kithuki','Makueni'),
 ('Wote','Makueni'), ('Mbitini','Makueni');

-- Compute/index normalized phone keys once, avoiding a scan for every contact.
CREATE TEMP TABLE existing_contact_keys ON COMMIT DROP AS
SELECT id, pg_temp.ke_phone(phone) AS phone_key FROM public.voter_registry;
CREATE INDEX ON existing_contact_keys(phone_key);
ANALYZE existing_contact_keys;

CREATE TEMP TABLE contact_matches ON COMMIT DROP AS
SELECT s.phone, count(k.id) AS match_count, min(k.id) AS voter_id
FROM public.makueni_contacts_stage_20261021 s
LEFT JOIN existing_contact_keys k ON k.phone_key = s.phone
WHERE s.import_state = 'loaded'
GROUP BY s.phone;
CREATE UNIQUE INDEX ON contact_matches(phone);

CREATE TEMP TABLE contact_import_plan ON COMMIT DROP AS
SELECT s.*, m.match_count, m.voter_id,
  CASE WHEN nullif(btrim(s.constituency), '') IN
    ('Kaiti','Kibwezi East','Kibwezi West','Makueni','Kilome','Mbooni')
    THEN btrim(s.constituency) ELSE NULL END AS incoming_constituency,
  CASE
    WHEN s.phone !~ '^254[17][0-9]{8}$' THEN 'invalid_phone'
    WHEN nullif(btrim(s.full_name), '') IS NULL THEN 'missing_name'
    WHEN string_to_array(coalesce(s.review_notes, ''), '; ') &&
         ARRAY['name_conflict','constituency_conflict','ward_conflict']
      THEN 'conflicting_source_details'
    WHEN nullif(btrim(s.constituency), '') IS NOT NULL
         AND btrim(s.constituency) NOT IN
         ('Kaiti','Kibwezi East','Kibwezi West','Makueni','Kilome','Mbooni','Kibwezi')
      THEN 'unsupported_constituency'
    WHEN nullif(btrim(s.ward), '') IS NOT NULL AND g.ward IS NULL
      THEN 'unsupported_ward'
    WHEN g.ward IS NOT NULL AND g.constituency IS DISTINCT FROM nullif(btrim(s.constituency), '')
      THEN 'ward_constituency_mismatch'
    WHEN m.match_count > 1 THEN 'multiple_existing_records_share_phone'
    WHEN m.match_count >= 1 AND nullif(btrim(v.ward), '') IS NOT NULL AND vg.ward IS NULL
      THEN 'existing_record_outside_makueni_scope'
    WHEN m.match_count >= 1 AND nullif(btrim(v.sub_county), '') IS NOT NULL
         AND btrim(v.sub_county) NOT IN ('Kaiti','Kibwezi East','Kibwezi West','Makueni','Kilome','Mbooni')
      THEN 'existing_constituency_needs_review'
    WHEN m.match_count >= 1 AND nullif(btrim(v.sub_county), '') IS NOT NULL
         AND nullif(btrim(s.constituency), '') NOT IN ('Kibwezi')
         AND btrim(v.sub_county) IS DISTINCT FROM nullif(btrim(s.constituency), '')
      THEN 'existing_constituency_conflict'
    WHEN m.match_count >= 1 AND nullif(btrim(s.ward), '') IS NOT NULL
         AND nullif(btrim(v.ward), '') IS NOT NULL AND btrim(v.ward) <> btrim(s.ward)
      THEN 'existing_ward_conflict'
    WHEN m.match_count >= 1 AND vg.ward IS NOT NULL
         AND nullif(btrim(s.constituency), '') NOT IN ('Kibwezi')
         AND vg.constituency IS DISTINCT FROM nullif(btrim(s.constituency), '')
      THEN 'existing_ward_constituency_conflict'
    WHEN m.match_count >= 1 AND btrim(s.constituency) = 'Kibwezi'
         AND (coalesce(nullif(btrim(v.sub_county), ''), vg.constituency) IS NOT NULL)
         AND coalesce(nullif(btrim(v.sub_county), ''), vg.constituency) NOT IN ('Kibwezi East','Kibwezi West')
      THEN 'existing_constituency_conflict'
    ELSE NULL
  END AS quality_issue
FROM public.makueni_contacts_stage_20261021 s
JOIN contact_matches m ON m.phone = s.phone
LEFT JOIN public.voter_registry v ON v.id = m.voter_id
LEFT JOIN import_geography g ON g.ward = nullif(btrim(s.ward), '')
LEFT JOIN import_geography vg ON vg.ward = nullif(btrim(v.ward), '')
WHERE s.import_state = 'loaded';

-- Keep a snapshot of only those existing rows this import will update.
CREATE TABLE IF NOT EXISTS public.makueni_contacts_backup_20261021 AS
SELECT v.*, now() AS backed_up_at FROM public.voter_registry v WHERE false;
CREATE UNIQUE INDEX IF NOT EXISTS makueni_contacts_backup_20261021_id_idx
ON public.makueni_contacts_backup_20261021(id);
ALTER TABLE public.makueni_contacts_backup_20261021 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.makueni_contacts_backup_20261021 FROM PUBLIC, anon, authenticated;
INSERT INTO public.makueni_contacts_backup_20261021
SELECT v.*, now() FROM public.voter_registry v
JOIN contact_import_plan p ON p.voter_id = v.id AND p.match_count >= 1
ON CONFLICT (id) DO NOTHING;

WITH updated AS (
  UPDATE public.voter_registry v SET
    full_name = coalesce(nullif(btrim(v.full_name), ''), btrim(p.full_name)),
    phone = p.phone,
    ward = coalesce(nullif(btrim(v.ward), ''), CASE WHEN p.quality_issue IS NULL THEN nullif(btrim(p.ward), '') ELSE NULL END),
    sub_county = coalesce(nullif(btrim(v.sub_county), ''), CASE WHEN p.quality_issue IS NULL THEN p.incoming_constituency ELSE NULL END),
    import_batch = 'makueni_combined_20261021',
    review_notes = concat_ws(E'\n', nullif(v.review_notes, ''),
      'Contact CSV import 2026-10-21. Source: ' || coalesce(p.source_files, '') ||
      '. Import notes: ' || coalesce(p.review_notes, '') ||
      '. CSV name: ' || coalesce(p.full_name, '') ||
      '. Alternate names: ' || coalesce(p.alternate_names, '') ||
      '. Source constituencies: ' || coalesce(p.source_constituencies, '') ||
      '. Source wards: ' || coalesce(p.source_wards, '') ||
      '. Review: ' || coalesce(p.quality_issue, 'none') || '. No electoral verification performed.'),
    updated_at = now()
  FROM contact_import_plan p
  WHERE p.voter_id = v.id AND p.match_count >= 1
  RETURNING v.id, v.phone
)
UPDATE public.makueni_contacts_stage_20261021 s
SET import_state = 'updated', registry_id = u.id, processed_at = now(), import_message = coalesce(p.quality_issue, 'Existing record retained; blank fields filled')
FROM updated u JOIN contact_import_plan p ON p.phone = u.phone WHERE s.phone = u.phone;

WITH inserted AS (
  INSERT INTO public.voter_registry
    (full_name, phone, ward, sub_county, status, source, import_batch, review_notes)
  SELECT coalesce(btrim(p.full_name), ''), p.phone,
    CASE WHEN p.quality_issue IS NULL THEN nullif(btrim(p.ward), '') ELSE NULL END,
    CASE WHEN p.quality_issue IS NULL THEN p.incoming_constituency ELSE NULL END,
    'pending', 'upload', 'makueni_combined_20261021',
    'Contact CSV import 2026-10-21. Source: ' || coalesce(p.source_files, '') ||
    '. Import notes: ' || coalesce(p.review_notes, '') ||
    '. Alternate names: ' || coalesce(p.alternate_names, '') ||
    '. Source constituencies: ' || coalesce(p.source_constituencies, '') ||
    '. Source wards: ' || coalesce(p.source_wards, '') ||
    '. Review: ' || coalesce(p.quality_issue, 'none') || '. No electoral verification performed.'
  FROM contact_import_plan p WHERE p.match_count = 0
  RETURNING id, phone
)
UPDATE public.makueni_contacts_stage_20261021 s
SET import_state = 'inserted', registry_id = i.id, processed_at = now(), import_message = coalesce(p.quality_issue, 'New contact imported')
FROM inserted i JOIN contact_import_plan p ON p.phone = i.phone WHERE s.phone = i.phone;

COMMIT;

-- Re-running does not reprocess completed rows. Flags are notes, not import exclusions.
SELECT import_state, count(*) AS records
FROM public.makueni_contacts_stage_20261021 GROUP BY import_state ORDER BY import_state;
SELECT import_message, count(*) AS records
FROM public.makueni_contacts_stage_20261021
WHERE import_message NOT IN ('New contact imported', 'Existing record retained; blank fields filled')
GROUP BY import_message ORDER BY records DESC;
