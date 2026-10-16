-- SMS consent. Unchecked until a Master or Admin saves the person with the box checked.
-- Nothing should send SMS unless sms_opt_in is true.

alter table clients add column if not exists sms_opt_in boolean not null default false;
alter table clients add column if not exists sms_opt_in_at timestamptz;

alter table profiles add column if not exists sms_opt_in boolean not null default false;
alter table profiles add column if not exists sms_opt_in_at timestamptz;

alter table team_invites add column if not exists sms_opt_in boolean not null default false;
alter table team_invites add column if not exists sms_opt_in_at timestamptz;
