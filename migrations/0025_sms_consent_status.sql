-- Client SMS consent is requested by the office, then confirmed by the client's reply.
-- sms_confirmed_at is the YES/START reply. Operational texts require sms_consent = confirmed.

alter table clients add column if not exists sms_consent text not null default 'none';
alter table clients add column if not exists sms_confirmed_at timestamptz;
alter table clients add column if not exists sms_confirm_sent_to text;

update clients
set sms_consent = 'requested',
    sms_opt_in = false
where coalesce(sms_opt_in, false) = true
  and coalesce(sms_consent, 'none') = 'none';
