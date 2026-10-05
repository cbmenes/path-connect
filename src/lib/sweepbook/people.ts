import type { Sql } from "@/lib/db";

export type AddressParts = {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
};

export function displayName(first?: string | null, last?: string | null, fallback = "") {
  const name = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  return name || fallback.trim();
}

export function splitDisplayName(raw?: string | null): { first_name: string; last_name: string } {
  const name = (raw || "").trim().replace(/\s+/g, " ");
  if (!name) return { first_name: "", last_name: "" };
  const i = name.indexOf(" ");
  if (i < 0) return { first_name: name, last_name: "" };
  return { first_name: name.slice(0, i), last_name: name.slice(i + 1).trim() };
}

export function emptyAddress(): AddressParts {
  return { address_line1: "", address_line2: "", city: "", state: "", zip: "" };
}

export function formatAddress(parts: Partial<AddressParts> | null | undefined, fallback = "") {
  if (!parts) return fallback;
  const line1 = (parts.address_line1 || "").trim();
  const line2 = (parts.address_line2 || "").trim();
  const city = (parts.city || "").trim();
  const state = (parts.state || "").trim();
  const zip = (parts.zip || "").trim();
  const cityLine = [city, state].filter(Boolean).join(", ");
  const tail = [cityLine, zip].filter(Boolean).join(" ");
  const out = [line1, line2, tail].filter(Boolean).join(", ");
  return out || fallback;
}

const STATE_RE = /\b([A-Za-z]{2})\b/;
const ZIP_RE = /\b(\d{5}(?:-\d{4})?)\b/;

export function parseAddress(raw?: string | null): AddressParts {
  const text = (raw || "").trim();
  if (!text) return emptyAddress();
  const chunks = text.split(",").map((s) => s.trim()).filter(Boolean);
  if (chunks.length >= 3) {
    const last = chunks[chunks.length - 1];
    const zip = last.match(ZIP_RE)?.[1] ?? "";
    const stateMatch = last.match(STATE_RE);
    const state = (stateMatch?.[1] || "").toUpperCase();
    let city = chunks[chunks.length - 2] || "";
    if (!state && stateMatch) {
      /* keep */
    }
    if (chunks.length >= 4) {
      return {
        address_line1: chunks[0],
        address_line2: chunks.slice(1, -2).join(", "),
        city,
        state,
        zip: zip || last.replace(STATE_RE, "").trim(),
      };
    }
    return {
      address_line1: chunks[0],
      address_line2: "",
      city,
      state,
      zip: zip || last.replace(/[A-Za-z]/g, "").replace(/^\s+|\s+$/g, "").replace(/^-\s*/, ""),
    };
  }
  if (chunks.length === 2) {
    const last = chunks[1];
    const zip = last.match(ZIP_RE)?.[1] ?? "";
    const state = (last.match(STATE_RE)?.[1] || "").toUpperCase();
    const city = last.replace(ZIP_RE, "").replace(STATE_RE, "").replace(/[,\s]+/g, " ").trim();
    if (city || state || zip) {
      return { address_line1: chunks[0], address_line2: "", city, state, zip };
    }
  }
  return { address_line1: text, address_line2: "", city: "", state: "", zip: "" };
}

export function phoneDigits(raw?: string | null) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Format as the user types: (XXX) XXX-XXXX */
export function formatPhoneAsTyped(raw?: string | null) {
  const d = phoneDigits(raw);
  if (!d) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function storePhone(raw?: string | null) {
  const d = phoneDigits(raw);
  return d || null;
}

export function slugifyBusiness(raw?: string | null) {
  const slug = String(raw || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "book";
}

export async function allocateBookingSlug(
  sql: Sql,
  desired: string,
  excludeUserId?: string,
) {
  const base = slugifyBusiness(desired);
  for (let i = 0; i < 40; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`.slice(0, 56);
    const rows = excludeUserId
      ? await sql<{ user_id: string }>`
          select user_id from profiles
          where booking_slug = ${slug} and user_id <> ${excludeUserId}
          limit 1
        `
      : await sql<{ user_id: string }>`
          select user_id from profiles where booking_slug = ${slug} limit 1
        `;
    if (!rows[0]) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function ensureBookingSlug(
  sql: Sql,
  ownerId: string,
  hint?: string | null,
) {
  const rows = await sql<{ booking_slug: string | null; business_name: string | null; full_name: string }>`
    select booking_slug, business_name, full_name from profiles where user_id = ${ownerId} limit 1
  `;
  const row = rows[0];
  if (row?.booking_slug) return row.booking_slug;
  const slug = await allocateBookingSlug(
    sql,
    hint || row?.business_name || row?.full_name || "book",
    ownerId,
  );
  await sql`update profiles set booking_slug = ${slug} where user_id = ${ownerId}`;
  return slug;
}

export function intOrNull(raw?: string | number | null) {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function numberOrNull(raw?: string | number | null) {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function addressPartsFrom(
  row?: {
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    address?: string | null;
  } | null,
): AddressParts {
  if (!row) return emptyAddress();
  if (row.address_line1 || row.city || row.state || row.zip) {
    return {
      address_line1: (row.address_line1 || "").trim(),
      address_line2: (row.address_line2 || "").trim(),
      city: (row.city || "").trim(),
      state: (row.state || "").trim().toUpperCase(),
      zip: (row.zip || "").trim(),
    };
  }
  return parseAddress(row.address);
}

export function namesFrom(
  first?: string | null,
  last?: string | null,
  fallback?: string | null,
) {
  let first_name = (first || "").trim();
  let last_name = (last || "").trim();
  if (!first_name && !last_name && fallback) {
    const split = splitDisplayName(fallback);
    first_name = split.first_name;
    last_name = split.last_name;
  }
  return { first_name, last_name, name: displayName(first_name, last_name, fallback || "") };
}
