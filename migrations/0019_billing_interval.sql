-- Billing interval and the paid-through date. Nullable so existing rows stay monthly.

alter table profiles add column if not exists billing_interval text;
alter table profiles add column if not exists current_period_end timestamptz;
alter table profiles add column if not exists cancel_at_period_end boolean;
