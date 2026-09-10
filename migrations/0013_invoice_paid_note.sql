-- Optional note when an appointment is marked paid without charging a card.
alter table invoices add column if not exists paid_note text;
