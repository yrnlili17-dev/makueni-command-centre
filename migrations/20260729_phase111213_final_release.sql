CREATE TABLE IF NOT EXISTS election_agent_reports (
  id serial PRIMARY KEY,
  polling_station text NOT NULL,
  ward text,
  constituency text,
  agent_name text NOT NULL,
  report_type text NOT NULL DEFAULT 'status',
  turnout integer NOT NULL DEFAULT 0,
  registered_voters integer NOT NULL DEFAULT 0,
  candidate_votes integer NOT NULL DEFAULT 0,
  total_valid_votes integer NOT NULL DEFAULT 0,
  incident_level text NOT NULL DEFAULT 'none',
  notes text,
  form_reference text,
  verification_status text NOT NULL DEFAULT 'pending',
  reported_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_campaign_content (
  id serial PRIMARY KEY,
  content_type text NOT NULL DEFAULT 'update',
  title text NOT NULL,
  summary text,
  body text,
  image_url text,
  action_label text,
  action_url text,
  published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_checks (
  id serial PRIMARY KEY,
  check_name text NOT NULL,
  category text NOT NULL DEFAULT 'operations',
  status text NOT NULL DEFAULT 'pending',
  details text,
  owner text,
  last_checked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_incidents (
  id serial PRIMARY KEY,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  service text,
  description text,
  resolution text,
  opened_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp
);
