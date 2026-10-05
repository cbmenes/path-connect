-- Visit checklists (copied onto each job) + cleaner on-the-way / start / finish.

create table if not exists checklist_templates (
  id text primary key,
  cleaner_user_id text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_templates_cleaner_idx
  on checklist_templates (cleaner_user_id, sort_order);

create table if not exists checklist_template_items (
  id text primary key,
  template_id text not null references checklist_templates(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create index if not exists checklist_template_items_template_idx
  on checklist_template_items (template_id, sort_order);

create table if not exists job_checklist_items (
  id text primary key,
  job_id text not null references jobs(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  checked integer not null default 0,
  checked_at timestamptz,
  checked_by_user_id text
);

create index if not exists job_checklist_items_job_idx
  on job_checklist_items (job_id, sort_order);

alter table clients add column if not exists checklist_template_id text;
alter table jobs add column if not exists checklist_template_id text;

alter table jobs add column if not exists progress_status text
  check (progress_status is null or progress_status in ('on_the_way', 'in_progress', 'finished'));
alter table jobs add column if not exists on_the_way_at timestamptz;
alter table jobs add column if not exists started_at timestamptz;
alter table jobs add column if not exists finished_at timestamptz;
