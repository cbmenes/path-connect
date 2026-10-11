alter table invoices add column if not exists stripe_checkout_session_id text;
alter table invoices add column if not exists stripe_payment_intent_id text;
alter table invoices add column if not exists stripe_account_id text;

create unique index if not exists invoices_stripe_checkout_session_idx
  on invoices (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
