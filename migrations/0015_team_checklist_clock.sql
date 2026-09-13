-- Account + per-cleaner access for job checklists and On my way / Start / Finish.

alter table profiles add column if not exists team_checklists_enabled boolean not null default true;
alter table profiles add column if not exists team_clock_in_enabled boolean not null default true;
alter table profiles add column if not exists can_see_checklists boolean not null default true;
alter table profiles add column if not exists can_clock_in boolean not null default true;
