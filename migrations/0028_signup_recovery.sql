-- One abandoned-signup email per CrewWeek Stripe customer.
-- The row is written when the customer is created and sent only after send_after,
-- and only if they still have no active subscription and no successful payment.

create table if not exists signup_recovery_emails (
  stripe_customer_id text primary key,
  email text not null,
  user_id text,
  send_after timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'skipped')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signup_recovery_due_idx
  on signup_recovery_emails (send_after)
  where status = 'pending';
