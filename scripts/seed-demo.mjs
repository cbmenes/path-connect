#!/usr/bin/env node
/**
 * Idempotent demo logins for production Postgres.
 *
 * Runs at the end of `npm run build` when DATABASE_URL is set (Vercel env, never
 * a file in the repo). Creates the public demo users only when they are missing
 * and does not replace an existing password. The same pass also runs on each
 * auth request (`src/routes/api/auth/$.ts`) so a database attached after the
 * last build still receives the rows.
 *
 * No DATABASE_URL (local preview) → skip. PGLite seeds itself in-process.
 */
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[seed] DATABASE_URL not set — skipping demo users.");
  process.exit(0);
}

const USERS = [
  {
    id: "demo-cleaner-maya",
    name: "Maya Brooks",
    email: "demo@sweepbook.app",
    password: "demo123",
    profile: {
      role: "cleaner",
      fullName: "Maya Brooks",
      businessName: "Brooks Clean Co.",
      phone: "(405) 555-0148",
      policy:
        "Cancellations made less than 24 hours before a visit may be charged half the scheduled rate. Weather delays are never charged.",
      cleanerKind: "master",
      masterUserId: null,
      planStatus: "active",
      planPriceCents: 7900,
    },
  },
  {
    id: "demo-team-lena",
    name: "Lena Ruiz",
    email: "team@sweepbook.app",
    password: "team123",
    profile: {
      role: "cleaner",
      fullName: "Lena Ruiz",
      businessName: null,
      phone: "(405) 555-0160",
      policy: null,
      cleanerKind: "team",
      masterUserId: "demo-cleaner-maya",
      planStatus: "trial",
      planPriceCents: 1900,
    },
  },
  {
    id: "demo-client-cam",
    name: "Cam Delgado",
    email: "client@sweepbook.app",
    password: "client123",
    profile: {
      role: "client",
      fullName: "Cam Delgado",
      businessName: null,
      phone: "(405) 555-0194",
      policy: null,
      cleanerKind: null,
      masterUserId: null,
      planStatus: "trial",
      planPriceCents: 1900,
    },
  },
];

async function ensureUser(client, user) {
  const now = new Date().toISOString();
  const existing = await client.query(`select id from "user" where email = $1 limit 1`, [
    user.email,
  ]);
  const userId = existing.rows[0]?.id ?? user.id;
  if (!existing.rows.length) {
    await client.query(
      `insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
       values ($1, $2, $3, true, null, $4, $4)`,
      [userId, user.name, user.email, now],
    );
  }

  const account = await client.query(
    `select id from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [userId],
  );
  if (!account.rows.length) {
    const hash = await hashPassword(user.password);
    await client.query(
      `insert into "account" (
         id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
       ) values ($1, $2, 'credential', $2, $3, $4, $4)`,
      [`acc_${randomUUID()}`, userId, hash, now],
    );
  }

  const p = user.profile;
  await client.query(
    `insert into profiles (
       user_id, role, full_name, business_name, phone, cancellation_policy,
       default_duration_min, default_rate_cents, cleaner_kind, email,
       master_user_id, plan_status, plan_price_cents
     ) values (
       $1, $2, $3, $4, $5, $6,
       120, 15000, $7, $8,
       $9, $10, $11
     )
     on conflict (user_id) do nothing`,
    [
      userId,
      p.role,
      p.fullName,
      p.businessName,
      p.phone,
      p.policy,
      p.cleanerKind,
      user.email,
      p.masterUserId,
      p.planStatus,
      p.planPriceCents,
    ],
  );
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    for (const user of USERS) {
      await ensureUser(client, user);
      console.log(`[seed] ${user.email} ready`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err?.message || err);
  process.exit(1);
});
