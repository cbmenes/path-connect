-- Email appointment reminders (no SMS).
-- Master: email_reminders (default on) + reminder_email_team (default off).
-- Client: email_reminders is their personal opt-in (default on).

alter table profiles
  add column if not exists email_reminders boolean not null default true;

alter table profiles
  add column if not exists reminder_email_team boolean not null default false;

create table if not exists reminder_sends (
  id text primary key,
  job_id text,
  cleaner_user_id text,
  recipient_email text not null,
  recipient_role text not null,
  status text not null default 'queued',
  due_at timestamp,
  sent_at timestamp,
  error text,
  created_at timestamp not null default now()
);

create unique index if not exists reminder_sends_job_recipient_role_idx
  on reminder_sends (job_id, recipient_email, recipient_role)
  where recipient_role <> 'test';

create index if not exists reminder_sends_due_idx
  on reminder_sends (status, due_at);
