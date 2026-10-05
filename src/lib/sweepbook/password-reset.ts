import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { getSql, type Sql } from "@/lib/db";
import { isMailConfigured, publicAppUrl, sendMail } from "./mail";
import { ensureDemoSeed } from "./seed";
import { APP_NAME, HELLO_EMAIL } from "@/lib/brand";
import { nid } from "./time";

export const RESET_SUCCESS_MESSAGE = "If that email is on file, we sent a reset link.";
const TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_FROM = `${APP_NAME} <${HELLO_EMAIL}>`;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function newResetToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function requestOrigin(): Promise<string> {
  const explicit = publicAppUrl();
  if (explicit) return explicit;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) return "";
    const url = new URL(request.url);
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      url.protocol.replace(":", "") ||
      "https";
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host") ||
      url.host;
    return host ? `${proto}://${host}`.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

async function resetLink(token: string) {
  const origin = await requestOrigin();
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  return origin ? `${origin}${path}` : path;
}

function resetEmailCopy(resetUrl: string) {
  const subject = `Reset your ${APP_NAME} password.`;
  const text = [
    `We received a request to reset your ${APP_NAME} password.`,
    "",
    `Reset your password (expires in 1 hour, one use):`,
    resetUrl,
    "",
    "If you did not ask for this, you can ignore this email. Your password stays the same.",
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#1a2332">
      <p>We received a request to reset your ${APP_NAME} password.</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#1b365d;color:#fffcf7;text-decoration:none;padding:12px 18px;border-radius:8px">
          Reset password
        </a>
      </p>
      <p>This link expires in 1 hour and can be used once.</p>
      <p style="color:#5e675c;font-size:13px">If the button does not work, copy this link:<br />${resetUrl}</p>
      <p>If you did not ask for this, you can ignore this email. Your password stays the same.</p>
    </div>
  `.trim();
  return { subject, text, html };
}

async function findLoginUser(sql: Sql, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return null;
  const rows = await sql<{ id: string; email: string }>`
    select id, email from "user"
    where lower(email) = ${normalized}
    limit 1
  `;
  return rows[0] ?? null;
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => ({
    email: String(input?.email ?? ""),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);

    const generic = {
      ok: true as const,
      message: RESET_SUCCESS_MESSAGE,
      mailConfigured: isMailConfigured(),
      previewHint: isDev()
        ? isMailConfigured()
          ? "Development: reset emails send when mail is configured."
          : "Development: if that email is on file, the reset link is also written to the server log."
        : undefined,
      previewResetUrl: undefined as string | undefined,
    };

    const user = await findLoginUser(sql, data.email);
    if (!user) return generic;

    const token = newResetToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    const onFile = user.email;

    await sql`
      update password_reset_tokens
      set used_at = now()
      where user_id = ${user.id} and used_at is null
    `;
    await sql`
      insert into password_reset_tokens (id, user_id, email, token_hash, expires_at)
      values (${nid("pwr")}, ${user.id}, ${onFile}, ${tokenHash}, ${expiresAt})
    `;

    const resetUrl = await resetLink(token);

    if (isMailConfigured()) {
      try {
        await sendMail({
          to: onFile,
          from: process.env.FROM_EMAIL?.trim() || RESET_FROM,
          ...resetEmailCopy(resetUrl),
        });
      } catch (err) {
        console.error("[sweepbook] password reset mail failed", err);
        if (isDev()) console.info("[sweepbook] password reset URL", resetUrl);
      }
    } else if (isDev()) {
      console.info("[sweepbook] password reset URL", resetUrl);
    }

    return {
      ...generic,
      previewResetUrl: isDev() ? resetUrl : undefined,
    };
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .validator((input: { token: string; password: string; confirm: string }) => ({
    token: String(input?.token ?? "").trim(),
    password: String(input?.password ?? ""),
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(async ({ data }) => {
    if (data.password.length < 8) {
      throw new Error("Use at least 8 characters.");
    }
    if (data.password !== data.confirm) {
      throw new Error("Passwords do not match.");
    }
    if (!data.token) {
      throw new Error("This reset link is invalid or has expired.");
    }

    const sql = await getSql();
    await ensureDemoSeed(sql);

    const tokenHash = await hashToken(data.token);
    const claimed = await sql<{ user_id: string; email: string }>`
      update password_reset_tokens
      set used_at = now()
      where token_hash = ${tokenHash}
        and used_at is null
        and expires_at > now()
      returning user_id, email
    `;
    const row = claimed[0];
    if (!row) {
      throw new Error("This reset link is invalid or has expired.");
    }

    const users = await sql<{ id: string }>`
      select id from "user" where id = ${row.user_id} limit 1
    `;
    if (!users[0]) {
      throw new Error("This reset link is invalid or has expired.");
    }

    const now = new Date().toISOString();
    const hash = await hashPassword(data.password);
    const accounts = await sql<{ id: string }>`
      select id from "account"
      where "userId" = ${row.user_id} and "providerId" = ${"credential"}
      limit 1
    `;
    if (accounts[0]) {
      await sql`
        update "account"
        set password = ${hash}, "updatedAt" = ${now}
        where id = ${accounts[0].id} and "userId" = ${row.user_id}
      `;
    } else {
      await sql`
        insert into "account" (
          id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
        ) values (
          ${nid("acc")}, ${row.user_id}, ${"credential"}, ${row.user_id}, ${hash}, ${now}, ${now}
        )
      `;
    }

    await sql`delete from "session" where "userId" = ${row.user_id}`;

    return { ok: true as const };
  });
