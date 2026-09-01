import { i as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-hdpPMi0e.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { m as nid } from "./time-DJsHuhyu.mjs";
import { c as createServerRpc, i as assertCleaner, l as getActor } from "./access-DwbveIs5.mjs";
import { t as ensureDemoSeed } from "./seed-hBcEn49k.mjs";
import { a as parseAssignees, c as replaceClientAssignees, n as applyAssigneesToClientRecurring } from "./assignees-nQ-loMsf.mjs";
import { n as insertNotification } from "./notifications-2GPgnREj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients-CbVeWDRy.js
var CLIENT_SELECT = `
  id, cleaner_user_id, linked_user_id, name, phone, email, address,
  access_notes, pets, supplies, default_price_cents, default_duration_min,
  usual_day, usual_time, frequency, notes, created_at::text as created_at,
  (select coalesce(json_agg(json_build_object('user_id', p.user_id, 'full_name', p.full_name) order by p.full_name), '[]'::json)
     from client_assignees ca join profiles p on p.user_id = ca.user_id
     where ca.client_id = clients.id) as assignees_json
`;
function withAssignees(row) {
	const assignees = parseAssignees(row.assignees_json);
	const { assignees_json: _ignored, ...rest } = row;
	return {
		...rest,
		assignees,
		assigned_user_ids: assignees.map((a) => a.user_id)
	};
}
var listClients_createServerFn_handler = createServerRpc({
	id: "fc209a7a52b666710d32288eda5ab5803c3b59522b71fdc7b5ace90cf5456031",
	name: "listClients",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => listClients.__executeServer(opts));
var listClients = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listClients_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureDemoSeed(sql);
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	return (await sql.query(`select ${CLIENT_SELECT} from clients where cleaner_user_id = $1 order by name asc`, [context.userId])).map(withAssignees);
});
var getClient_createServerFn_handler = createServerRpc({
	id: "8a7de781936c7ce260f351967584cab362164cbd6d0ba365d2adf3970af95235",
	name: "getClient",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => getClient.__executeServer(opts));
var getClient = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(getClient_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	if (actor.kind === "cleaner") {
		const rows = await sql.query(`select ${CLIENT_SELECT} from clients where id = $1 and cleaner_user_id = $2 limit 1`, [id, context.userId]);
		const client = rows[0] ? withAssignees(rows[0]) : null;
		if (!client) throw new Error("Client not found.");
		return {
			client,
			jobs: await sql`
        select id, cleaner_user_id, client_id, service, address, start_at::text as start_at,
               duration_min, price_cents, notes, status, recurrence, series_id,
               cancel_reason, reschedule_note, tip_cents, tip_requested,
               created_at::text as created_at
        from jobs where client_id = ${id} and cleaner_user_id = ${context.userId}
        order by start_at desc limit 40
      `,
			invoices: await sql`
        select id, cleaner_user_id, client_id, job_id, amount_cents, description, status,
               method, kind, paid_at::text as paid_at, failure_reason, receipt_number,
               created_at::text as created_at
        from invoices where client_id = ${id} and cleaner_user_id = ${context.userId}
        order by created_at desc limit 20
      `,
			cards: await sql`
        select id, cleaner_user_id, client_id, brand, last4, exp_month, exp_year,
               holder_name, source, is_default, failing, created_at::text as created_at
        from payment_cards where client_id = ${id} and cleaner_user_id = ${context.userId}
        order by is_default desc, created_at desc
      `,
			messages: await sql`
        select id, cleaner_user_id, client_id, sender_role, body, created_at::text as created_at,
               read_at::text as read_at
        from messages where client_id = ${id} and cleaner_user_id = ${context.userId}
        order by created_at desc limit 8
      `,
			staff: await sql`
        select user_id, full_name from profiles
        where master_user_id = ${context.userId} and coalesce(team_status, 'active') = 'active'
        order by full_name
      `
		};
	}
	if (actor.kind === "client" && actor.client.id === id) return {
		client: actor.client,
		jobs: [],
		invoices: [],
		cards: [],
		messages: [],
		staff: []
	};
	throw new Error("Client not found.");
});
function cleanClient(input) {
	const name = input.name.trim();
	if (!name) throw new Error("Name is required.");
	return {
		name,
		phone: input.phone?.trim() || null,
		email: input.email?.trim() || null,
		address: input.address?.trim() || null,
		access_notes: input.access_notes?.trim() || null,
		pets: input.pets?.trim() || null,
		supplies: input.supplies?.trim() || null,
		default_price_cents: input.default_price_cents ?? null,
		default_duration_min: input.default_duration_min ?? null,
		usual_day: input.usual_day?.trim() || null,
		usual_time: input.usual_time?.trim() || null,
		frequency: input.frequency?.trim() || null,
		notes: input.notes?.trim() || null
	};
}
var createClient_createServerFn_handler = createServerRpc({
	id: "26bdad0338f4d2c830b11e8285c9ae5e0d630e4121e13770eb3dbd5cd2a4d759",
	name: "createClient",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => createClient.__executeServer(opts));
var createClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => cleanClient(input)).handler(createClient_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const id = nid("client");
	await sql`
      insert into clients (
        id, cleaner_user_id, name, phone, email, address, access_notes, pets, supplies,
        default_price_cents, default_duration_min, usual_day, usual_time, frequency, notes
      ) values (
        ${id}, ${context.userId}, ${data.name}, ${data.phone}, ${data.email}, ${data.address},
        ${data.access_notes}, ${data.pets}, ${data.supplies}, ${data.default_price_cents},
        ${data.default_duration_min}, ${data.usual_day}, ${data.usual_time}, ${data.frequency},
        ${data.notes}
      )
    `;
	return { id };
});
var updateClient_createServerFn_handler = createServerRpc({
	id: "b2e9844f93c8b1edfce6f71f18b776c1b5def9d13bd9390f2fcd3d8155919c38",
	name: "updateClient",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => updateClient.__executeServer(opts));
var updateClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: input.id,
	...cleanClient(input)
})).handler(updateClient_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	await sql`
      update clients set
        name = ${data.name},
        phone = ${data.phone},
        email = ${data.email},
        address = ${data.address},
        access_notes = ${data.access_notes},
        pets = ${data.pets},
        supplies = ${data.supplies},
        default_price_cents = ${data.default_price_cents},
        default_duration_min = ${data.default_duration_min},
        usual_day = ${data.usual_day},
        usual_time = ${data.usual_time},
        frequency = ${data.frequency},
        notes = ${data.notes}
      where id = ${data.id} and cleaner_user_id = ${context.userId}
    `;
	return { ok: true };
});
var setClientAssignees_createServerFn_handler = createServerRpc({
	id: "215c4bda66dd179d3eb7c608ea5601d588e3828600c345e2aa2e3d2f231f505d",
	name: "setClientAssignees",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => setClientAssignees.__executeServer(opts));
var setClientAssignees = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(setClientAssignees_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const owned = await sql`
      select id, name from clients where id = ${data.clientId} and cleaner_user_id = ${context.userId} limit 1
    `;
	if (!owned[0]) throw new Error("Client not found.");
	const unique = [...new Set((data.userIds ?? []).filter(Boolean))];
	await replaceClientAssignees(sql, data.clientId, unique);
	await applyAssigneesToClientRecurring(sql, data.clientId, unique);
	for (const userId of unique) await insertNotification(sql, {
		userId,
		kind: "job_assigned",
		title: `Assigned: ${owned[0].name}`,
		body: "You were assigned to this client's recurring visits.",
		clientId: data.clientId,
		clientName: owned[0].name
	});
	return { ok: true };
});
var deleteClient_createServerFn_handler = createServerRpc({
	id: "486867218c23bc600baa36164115856817680628530e3715843549dbec01fc17",
	name: "deleteClient",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => deleteClient.__executeServer(opts));
var deleteClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(deleteClient_createServerFn_handler, async ({ context, data: id }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const owned = await sql`
      select id, name from clients where id = ${id} and cleaner_user_id = ${context.userId} limit 1
    `;
	if (!owned[0]) throw new Error("Client not found.");
	await sql`delete from job_assignees where job_id in (select id from jobs where client_id = ${id})`;
	await sql`delete from client_assignees where client_id = ${id}`;
	await sql`delete from messages where client_id = ${id}`;
	await sql`delete from invoices where client_id = ${id}`;
	await sql`delete from payment_cards where client_id = ${id}`;
	await sql`delete from invites where client_id = ${id}`;
	await sql`delete from card_links where client_id = ${id}`;
	await sql`delete from notifications where client_id = ${id}`;
	await sql`delete from jobs where client_id = ${id}`;
	await sql`delete from clients where id = ${id} and cleaner_user_id = ${context.userId}`;
	return {
		ok: true,
		name: owned[0].name
	};
});
var CSV_FIELDS = [
	"name",
	"phone",
	"email",
	"address",
	"notes",
	"usual_day",
	"usual_time",
	"price",
	"frequency"
];
function parsePrice(raw) {
	const n = Number(String(raw).replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.round(n * (n < 1e3 ? 100 : 1));
}
var importClients_createServerFn_handler = createServerRpc({
	id: "52aba73f33fe3ee63b5c17647969dc4cd3d1bc8f721156feccce10eaea9630fd",
	name: "importClients",
	filename: "src/lib/sweepbook/clients.ts"
}, (opts) => importClients.__executeServer(opts));
var importClients = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((rows) => rows).handler(importClients_createServerFn_handler, async ({ context, data: rows }) => {
	const sql = await getSql();
	const actor = await getActor(sql, context.userId);
	assertCleaner(actor);
	const imported = [];
	let skipped = 0;
	for (const row of rows) {
		const name = (row.name || "").trim();
		if (!name) {
			skipped += 1;
			continue;
		}
		const missing = [];
		for (const field of CSV_FIELDS) {
			if (field === "name") continue;
			if (!(row[field] || "").trim()) missing.push(field.replaceAll("_", " "));
		}
		const price = parsePrice(row.price || "");
		const id = nid("client");
		await sql`
        insert into clients (
          id, cleaner_user_id, name, phone, email, address, notes,
          usual_day, usual_time, frequency, default_price_cents
        ) values (
          ${id}, ${context.userId}, ${name}, ${row.phone?.trim() || null},
          ${row.email?.trim() || null}, ${row.address?.trim() || null},
          ${row.notes?.trim() || null}, ${row.usual_day?.trim().toLowerCase() || null},
          ${row.usual_time?.trim() || null}, ${row.frequency?.trim().toLowerCase() || null},
          ${price}
        )
      `;
		imported.push({
			id,
			name,
			missing
		});
	}
	return {
		importedCount: imported.length,
		skipped,
		imported,
		missingCount: imported.filter((r) => r.missing.length).length
	};
});
//#endregion
export { createClient_createServerFn_handler, deleteClient_createServerFn_handler, getClient_createServerFn_handler, importClients_createServerFn_handler, listClients_createServerFn_handler, setClientAssignees_createServerFn_handler, updateClient_createServerFn_handler };
