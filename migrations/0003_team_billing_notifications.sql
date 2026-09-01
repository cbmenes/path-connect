-- Team cleaners, job assignment, notifications, and SweepBook billing methods.

alter table profiles add column if not exists email text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists cleaner_kind text;
alter table profiles add column if not exists master_user_id text;
alter table profiles add column if not exists can_message boolean not null default true;
alter table profiles add column if not exists team_status text;
alter table profiles add column if not exists team_messaging_enabled boolean not null default true;
alter table profiles add column if not exists plan_status text not null default 'trial';
alter table profiles add column if not exists plan_price_cents integer not null default 1900;

alter table jobs add column if not exists assigned_to_user_id text;
alter table jobs add column if not exists reschedule_requested_at timestamptz;

create index if not exists jobs_assigned_idx on jobs (assigned_to_user_id, start_at);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text,
  job_id text,
  client_id text,
  client_name text,
  requested_start_at timestamptz,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists team_invites (
  id text primary key,
  token text not null unique,
  master_user_id text not null,
  name text not null,
  phone text,
  email text,
  can_message boolean not null default true,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists team_invites_token_idx on team_invites (token);

create table if not exists billing_methods (
  id text primary key,
  user_id text not null,
  kind text not null check (kind in ('card', 'ach')),
  brand text,
  last4 text not null,
  exp_month integer,
  exp_year integer,
  holder_name text,
  bank_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists billing_methods_user_idx on billing_methods (user_id);
