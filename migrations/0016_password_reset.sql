-- Single-use password reset tokens. No FK to "user" (platform rule).
-- Look up by token_hash; expire after 1 hour; mark used_at on consume.

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on password_reset_tokens (user_id);

create index if not exists password_reset_tokens_expires_idx
  on password_reset_tokens (expires_at);
