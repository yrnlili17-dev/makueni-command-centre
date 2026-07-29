CREATE TABLE IF NOT EXISTS research_workspaces (
  id serial PRIMARY KEY,
  title text NOT NULL,
  query text NOT NULL,
  geography text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_sources (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES research_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  source text,
  topic text,
  sentiment text NOT NULL DEFAULT 'neutral',
  published_at text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_sources_workspace_idx ON research_sources(workspace_id);
