alter table clients add column if not exists stripe_customer_id text;
alter table clients add column if not exists stripe_customer_account_id text;
alter table payment_cards add column if not exists stripe_payment_method_id text;
alter table payment_cards add column if not exists stripe_account_id text;
