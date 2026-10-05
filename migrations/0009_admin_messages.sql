-- Admin ↔ Client, Master ↔ Admin, and Admin ↔ Team are their own channels.
-- admin_user_id holds the admin on admin_team (team_user_id is the cleaner).

alter table messages add column if not exists admin_user_id text;

create index if not exists messages_admin_channel_idx
  on messages (cleaner_user_id, channel, admin_user_id, team_user_id, client_id, created_at);
