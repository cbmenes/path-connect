-- Public "Request a clean" submissions. A request is not a calendar job
-- until Master or Admin accepts it.

create table if not exists clean_requests (
  id text primary key,
  cleaner_user_id text not null,
  name text not null,
  phone text,
  email text,
  address text,
  service_type text not null
    check (service_type in ('one-time', 'weekly', 'biweekly', 'monthly')),
  preferred_date text,
  preferred_time text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  decline_note text,
  job_id text,
  client_id text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists clean_requests_cleaner_idx
  on clean_requests (cleaner_user_id, created_at desc);

alter table notifications add column if not exists request_id text;

create index if not exists notifications_request_idx
  on notifications (request_id)
  where request_id is not null;
