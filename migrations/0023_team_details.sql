-- Cleaner and Admin details. Notes stay off team-facing profile loads.
-- Empty availability_json means no weekly restriction. No SSN column.

alter table profiles add column if not exists staff_notes text;
alter table profiles add column if not exists emergency_name text;
alter table profiles add column if not exists emergency_phone text;
alter table profiles add column if not exists birthday date;
alter table profiles add column if not exists start_date date;
alter table profiles add column if not exists availability_json text;

alter table team_invites add column if not exists staff_notes text;
alter table team_invites add column if not exists emergency_name text;
alter table team_invites add column if not exists emergency_phone text;
alter table team_invites add column if not exists birthday date;
alter table team_invites add column if not exists start_date date;
alter table team_invites add column if not exists availability_json text;
alter table team_invites add column if not exists address_line1 text;
alter table team_invites add column if not exists address_line2 text;
alter table team_invites add column if not exists city text;
alter table team_invites add column if not exists state text;
alter table team_invites add column if not exists zip text;
