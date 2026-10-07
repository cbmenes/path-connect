import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertOffice, assertSubscriptionWritable, getActor, masterUserId } from "./access";
import { ensureDemoSeed } from "./seed";
import { nid } from "./time";

export const createInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((clientId: string) => clientId)
  .handler(async ({ context, data: clientId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    await assertSubscriptionWritable(sql, actor);
    const ownerId = masterUserId(actor);
    const rows = await sql<{ id: string; email: string | null; name: string }>`
      select id, email, name from clients where id = ${clientId} and cleaner_user_id = ${ownerId} limit 1
    `;
    const client = rows[0];
    if (!client) throw new Error("Client not found.");
    const token = nid("invite").replace(/-/g, "").slice(0, 22);
    await sql`
      insert into invites (id, token, cleaner_user_id, client_id, email)
      values (${nid("invt")}, ${token}, ${ownerId}, ${clientId}, ${client.email})
    `;
    return { token, path: `/invite/${token}`, email: client.email, name: client.name };
  });

export const getInvitePublic = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const rows = await sql.query<{
      token: string;
      client_name: string;
      cleaner_name: string;
      business_name: string | null;
      email: string | null;
      accepted_at: string | null;
      client_id: string;
    }>(
      `select i.token, c.name as client_name, p.full_name as cleaner_name, p.business_name,
              i.email, i.accepted_at::text as accepted_at, i.client_id
       from invites i
       join clients c on c.id = i.client_id
       join profiles p on p.user_id = i.cleaner_user_id
       where i.token = $1 limit 1`,
      [token],
    );
    const invite = rows[0];
    if (!invite) throw new Error("This invite is invalid or expired.");
    return invite;
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((token: string) => token)
  .handler(async ({ context, data: token }) => {
    const sql = await getSql();
    const rows = await sql<{ client_id: string; cleaner_user_id: string; accepted_at: string | null }>`
      select client_id, cleaner_user_id, accepted_at::text as accepted_at
      from invites where token = ${token} limit 1
    `;
    const invite = rows[0];
    if (!invite) throw new Error("This invite is invalid.");
    const actor = await getActor(sql, context.userId);
    if (actor.kind === "none") {
      const users = await sql<{ name: string; email: string }>`
        select name, email from "user" where id = ${context.userId} limit 1
      `;
      const u = users[0];
      await sql`
        insert into profiles (user_id, role, full_name)
        values (${context.userId}, ${"client"}, ${u?.name || "Client"})
        on conflict (user_id) do nothing
      `;
    } else if (actor.kind === "cleaner" || actor.kind === "admin" || actor.kind === "team") {
      throw new Error("You're signed in as office or team staff. Sign out to join as a client.");
    }
    await sql`
      update clients set linked_user_id = ${context.userId}
      where id = ${invite.client_id} and cleaner_user_id = ${invite.cleaner_user_id}
    `;
    await sql`update invites set accepted_at = now() where token = ${token}`;
    return { ok: true };
  });

export const getCardLinkPublic = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const sql = await getSql();
    await ensureDemoSeed(sql);
    const rows = await sql.query<{
      token: string;
      client_name: string;
      cleaner_name: string;
      business_name: string | null;
      used_at: string | null;
    }>(
      `select l.token, c.name as client_name, p.full_name as cleaner_name, p.business_name,
              l.used_at::text as used_at
       from card_links l
       join clients c on c.id = l.client_id
       join profiles p on p.user_id = l.cleaner_user_id
       where l.token = $1 limit 1`,
      [token],
    );
    const link = rows[0];
    if (!link) throw new Error("This add-card link is invalid.");
    return link;
  });
