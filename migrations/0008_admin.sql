-- Office Admin role: office helper on a Master's account, distinct from team cleaners.

alter table profiles add column if not exists can_charge boolean not null default false;

alter table team_invites add column if not exists invite_kind text not null default 'team';
alter table team_invites add column if not exists can_charge boolean not null default false;
