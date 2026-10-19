-- One row per client notice so a reminder, on-my-way alert, or cancellation is not repeated.
-- Test mode records status dry_run. Nothing here sends a message by itself.

create table if not exists client_notices (
  id text primary key,
  job_id text not null,
  client_id text not null,
  kind text not null,
  channel text not null,
  status text not null,
  destination text,
  body text,
  created_at timestamptz not null default now()
);

create unique index if not exists client_notices_job_kind_channel_uidx
  on client_notices (job_id, kind, channel);
