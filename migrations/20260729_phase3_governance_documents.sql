CREATE TABLE IF NOT EXISTS approval_requests (
  id serial PRIMARY KEY, token text NOT NULL UNIQUE, module text NOT NULL, action text NOT NULL,
  resource_type text NOT NULL, resource_id text, title text NOT NULL, description text,
  payload jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending', requested_by_id integer NOT NULL,
  requested_by_email text NOT NULL, reviewed_by_id integer, reviewed_by_email text, review_comment text,
  expires_at timestamp NOT NULL, reviewed_at timestamp, executed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS approval_events (
  id serial PRIMARY KEY, request_id integer NOT NULL, event text NOT NULL, actor_id integer NOT NULL,
  actor_email text NOT NULL, comment text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS document_folders (
  id serial PRIMARY KEY, name text NOT NULL, description text, parent_id integer, visibility text NOT NULL DEFAULT 'internal',
  created_by_id integer NOT NULL, created_by_email text NOT NULL, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS documents (
  id serial PRIMARY KEY, folder_id integer, title text NOT NULL, description text, original_name text NOT NULL,
  stored_name text, mime_type text NOT NULL DEFAULT 'application/octet-stream', size_bytes integer NOT NULL DEFAULT 0,
  storage_type text NOT NULL DEFAULT 'local', storage_url text, category text NOT NULL DEFAULT 'general', tags jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1, checksum text, status text NOT NULL DEFAULT 'active', requires_approval boolean NOT NULL DEFAULT false,
  approval_request_id integer, uploaded_by_id integer NOT NULL, uploaded_by_email text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS document_activity (
  id serial PRIMARY KEY, document_id integer NOT NULL, action text NOT NULL, actor_id integer NOT NULL,
  actor_email text NOT NULL, details text, created_at timestamp NOT NULL DEFAULT now()
);
