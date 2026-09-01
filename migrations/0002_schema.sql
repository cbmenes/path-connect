-- SweepBook application schema. Per-user rows keyed by TEXT user ids.

create table if not exists profiles (
  user_id text primary key,
  role text not null check (role in ('cleaner', 'client')),
  full_name text not null,
  business_name text,
  phone text,
  cancellation_policy text,
  default_duration_min integer not null default 120,
  default_rate_cents integer not null default 15000,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key,
  cleaner_user_id text not null,
  linked_user_id text,
  name text not null,
  phone text,
  email text,
  address text,
  access_notes text,
  pets text,
  supplies text,
  default_price_cents integer,
  default_duration_min integer,
  usual_day text,
  usual_time text,
  frequency text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists clients_cleaner_idx on clients (cleaner_user_id);
create index if not exists clients_linked_idx on clients (linked_user_id);

create table if not exists jobs (
  id text primary key,
  cleaner_user_id text not null,
  client_id text not null,
  service text not null default 'House cleaning',
  address text,
  start_at timestamptz not null,
  duration_min integer not null,
  price_cents integer not null,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'reschedule_requested')),
  recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'biweekly', 'monthly')),
  series_id text,
  cancel_reason text,
  reschedule_note text,
  tip_cents integer not null default 0,
  tip_requested boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jobs_cleaner_start_idx on jobs (cleaner_user_id, start_at);
create index if not exists jobs_client_idx on jobs (client_id);
create index if not exists jobs_series_idx on jobs (series_id);

create table if not exists messages (
  id text primary key,
  cleaner_user_id text not null,
  client_id text not null,
  sender_role text not null check (sender_role in ('cleaner', 'client')),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_thread_idx on messages (cleaner_user_id, client_id, created_at);

create table if not exists invoices (
  id text primary key,
  cleaner_user_id text not null,
  client_id text not null,
  job_id text,
  amount_cents integer not null,
  description text not null,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid', 'failed', 'void')),
  method text,
  kind text not null default 'visit'
    check (kind in ('visit', 'tip', 'other')),
  paid_at timestamptz,
  failure_reason text,
  receipt_number text,
  created_at timestamptz not null default now()
);

create index if not exists invoices_cleaner_idx on invoices (cleaner_user_id, created_at desc);
create index if not exists invoices_client_idx on invoices (client_id);

create table if not exists payment_cards (
  id text primary key,
  cleaner_user_id text not null,
  client_id text not null,
  brand text not null,
  last4 text not null,
  exp_month integer,
  exp_year integer,
  holder_name text,
  source text not null check (source in ('client', 'cleaner')),
  is_default boolean not null default false,
  failing boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cards_client_idx on payment_cards (client_id);

create table if not exists invites (
  id text primary key,
  token text not null unique,
  cleaner_user_id text not null,
  client_id text not null,
  email text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists invites_token_idx on invites (token);

create table if not exists card_links (
  id text primary key,
  token text not null unique,
  cleaner_user_id text not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists card_links_token_idx on card_links (token);
