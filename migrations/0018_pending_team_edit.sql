-- Fields a Master can set on a cleaner or Admin before the invite is accepted.

alter table team_invites add column if not exists pay_type text;
alter table team_invites add column if not exists pay_amount integer;
alter table team_invites add column if not exists pay_note text;
alter table team_invites add column if not exists can_clock_in boolean;

create table if not exists invite_client_assignees (
  invite_id text not null,
  client_id text not null,
  primary key (invite_id, client_id)
);

create index if not exists invite_client_assignees_client_idx on invite_client_assignees (client_id);
