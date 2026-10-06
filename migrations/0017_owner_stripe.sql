-- Owner (Master) software subscription. Client job cards stay out of this table.
-- Nullable so existing rows and demo accounts keep working without a subscription.

alter table profiles add column if not exists plan_code text;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;

create unique index if not exists profiles_stripe_customer_idx
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_idx
  on profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;
