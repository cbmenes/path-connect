-- Separate Master/Client, Team/Client, and Master/Team message channels.
-- Per-user read receipts. Saved team members can exist before an invite is sent.

alter table messages add column if not exists channel text not null default 'master_client';
alter table messages add column if not exists team_user_id text;
alter table messages add column if not exists sender_user_id text;
alter table messages add column if not exists sender_name text;

alter table messages alter column client_id drop not null;

update messages set channel = 'master_client' where channel is null or channel = '';

update messages m
set sender_user_id = m.cleaner_user_id
where m.sender_role = 'cleaner' and m.sender_user_id is null;

update messages m
set sender_user_id = c.linked_user_id
from clients c
where m.sender_role = 'client' and m.client_id = c.id and m.sender_user_id is null;

update messages m
set sender_name = case
  when m.sender_role = 'client' then c.name
  else coalesce(p.full_name, 'Cleaner')
end
from clients c, profiles p
where m.client_id = c.id
  and p.user_id = m.cleaner_user_id
  and m.sender_name is null;

create index if not exists messages_channel_idx on messages (cleaner_user_id, channel, client_id, team_user_id, created_at);

create table if not exists message_reads (
  message_id text not null,
  user_id text not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_user_idx on message_reads (user_id);

alter table team_invites add column if not exists invited_at timestamptz;
