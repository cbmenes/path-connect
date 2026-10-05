-- Optional Master-only pay rates for team cleaners. Never shown to team or clients.

alter table profiles
  add column if not exists pay_type text not null default 'none';

alter table profiles
  add column if not exists pay_amount integer not null default 0;

alter table profiles
  add column if not exists pay_note text;
