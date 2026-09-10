-- Team cleaner time off / availability. Clients never see these rows.

create table if not exists time_off (
  id text primary key,
  master_user_id text not null references users(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('all_day', 'range')),
  start_date text not null,
  end_date text not null,
  start_time text,
  end_time text,
  note text,
  deny_note text,
  status text not null check (status in ('pending', 'approved', 'denied', 'cancelled')),
  created_by_user_id text not null references users(id),
  handled_by_user_id text references users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists time_off_master_idx
  on time_off (master_user_id, status, start_date);

create index if not exists time_off_user_idx
  on time_off (user_id, status, start_date);
