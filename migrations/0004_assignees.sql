-- Multiple team assignees per client and per job. One visit invoice per appointment.

create table if not exists client_assignees (
  client_id text not null,
  user_id text not null,
  primary key (client_id, user_id)
);

create index if not exists client_assignees_user_idx on client_assignees (user_id);

create table if not exists job_assignees (
  job_id text not null,
  user_id text not null,
  primary key (job_id, user_id)
);

create index if not exists job_assignees_user_idx on job_assignees (user_id, job_id);

insert into job_assignees (job_id, user_id)
select id, assigned_to_user_id from jobs
where assigned_to_user_id is not null
on conflict do nothing;

insert into client_assignees (client_id, user_id)
select distinct client_id, assigned_to_user_id from jobs
where assigned_to_user_id is not null
on conflict do nothing;

delete from invoices
where kind = 'visit' and job_id is not null and id in (
  select id from (
    select id, row_number() over (
      partition by job_id
      order by case when status = 'paid' then 0 else 1 end, created_at desc, id desc
    ) as rn
    from invoices
    where kind = 'visit' and job_id is not null
  ) ranked
  where rn > 1
);

create unique index if not exists invoices_one_visit_per_job
  on invoices (job_id)
  where kind = 'visit' and job_id is not null;
