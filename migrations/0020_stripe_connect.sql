-- Stripe Connect Standard account for the cleaning company.
-- Nullable so existing rows and demo accounts stay unconnected.
-- Client card numbers are not stored here.

alter table profiles add column if not exists stripe_account_id text;

create unique index if not exists profiles_stripe_account_idx
  on profiles (stripe_account_id)
  where stripe_account_id is not null;
