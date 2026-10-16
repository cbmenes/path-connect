-- Consent is recorded when the client submits their own form, not when the office checks a box.
-- Company-set "requested" rows go back to not consented.

alter table clients add column if not exists sms_consent_token text;
create unique index if not exists clients_sms_consent_token_uidx
  on clients (sms_consent_token)
  where sms_consent_token is not null;

update clients
set sms_consent = 'none',
    sms_opt_in = false
where sms_consent = 'requested';
