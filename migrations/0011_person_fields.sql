-- First/last name, structured address, home size, and per-business booking slugs.

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists address_line1 text;
alter table profiles add column if not exists address_line2 text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists state text;
alter table profiles add column if not exists zip text;
alter table profiles add column if not exists booking_slug text;

alter table clients add column if not exists first_name text;
alter table clients add column if not exists last_name text;
alter table clients add column if not exists address_line1 text;
alter table clients add column if not exists address_line2 text;
alter table clients add column if not exists city text;
alter table clients add column if not exists state text;
alter table clients add column if not exists zip text;
alter table clients add column if not exists bedrooms integer;
alter table clients add column if not exists bathrooms numeric;
alter table clients add column if not exists square_footage integer;

alter table jobs add column if not exists address_line1 text;
alter table jobs add column if not exists address_line2 text;
alter table jobs add column if not exists city text;
alter table jobs add column if not exists state text;
alter table jobs add column if not exists zip text;

alter table clean_requests add column if not exists first_name text;
alter table clean_requests add column if not exists last_name text;
alter table clean_requests add column if not exists address_line1 text;
alter table clean_requests add column if not exists address_line2 text;
alter table clean_requests add column if not exists city text;
alter table clean_requests add column if not exists state text;
alter table clean_requests add column if not exists zip text;
alter table clean_requests add column if not exists bedrooms integer;
alter table clean_requests add column if not exists bathrooms numeric;
alter table clean_requests add column if not exists square_footage integer;

update profiles
set
  first_name = coalesce(nullif(first_name, ''), split_part(trim(full_name), ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(btrim(substring(trim(full_name) from position(' ' in trim(full_name)))), '')
  )
where coalesce(first_name, '') = '' and coalesce(full_name, '') <> '';

update clients
set
  first_name = coalesce(nullif(first_name, ''), split_part(trim(name), ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(btrim(substring(trim(name) from position(' ' in trim(name)))), '')
  ),
  address_line1 = coalesce(nullif(address_line1, ''), address)
where coalesce(first_name, '') = '' or coalesce(address_line1, '') = '';

update clean_requests
set
  first_name = coalesce(nullif(first_name, ''), split_part(trim(name), ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(btrim(substring(trim(name) from position(' ' in trim(name)))), '')
  ),
  address_line1 = coalesce(nullif(address_line1, ''), address)
where coalesce(first_name, '') = '' or coalesce(address_line1, '') = '';

update jobs
set address_line1 = coalesce(nullif(address_line1, ''), address)
where coalesce(address_line1, '') = '' and address is not null;

create unique index if not exists profiles_booking_slug_uidx
  on profiles (booking_slug)
  where booking_slug is not null;
