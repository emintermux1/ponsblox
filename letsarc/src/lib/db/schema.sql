CREATE TABLE IF NOT EXISTS launches (
  id bigserial PRIMARY KEY,
  trigger_tweet_id text NOT NULL UNIQUE,
  trigger_tweet_url text,
  trigger_text text,
  requester_x_id text NOT NULL,
  requester_username text NOT NULL,
  source_tweet_id text,
  source_tweet_url text,
  source_username text,
  source_text text,
  source_media text,
  ticker text,
  token_name text,
  status text NOT NULL,
  transaction_hash text,
  token_address text,
  argus_url text,
  error_code text,
  error_message text,
  event_received_ms bigint,
  tweet_resolved_ms bigint,
  parsed_ms bigint,
  transaction_submitted_ms bigint,
  transaction_confirmed_ms bigint,
  reply_posted_ms bigint,
  total_launch_ms bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meta (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE INDEX IF NOT EXISTS launches_status_idx ON launches (status);
CREATE INDEX IF NOT EXISTS launches_created_idx ON launches (created_at DESC);
