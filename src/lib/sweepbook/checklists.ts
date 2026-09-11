import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertOffice, getActor, isOffice, masterUserId } from "./access";
import { teamCanAccessJob } from "./assignees";
import { nid } from "./time";

export type ChecklistTemplateItem = {
  id: string;
  label: string;
  sort_order: number;
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  items: ChecklistTemplateItem[];
};

export type JobChecklistItem = {
  id: string;
  job_id: string;
  label: string;
  sort_order: number;
  checked: boolean;
  checked_at: string | null;
  checked_by_user_id: string | null;
};

const DEFAULT_TEMPLATES: { name: string; items: string[] }[] = [
  {
    name: "Standard",
    items: [
      "Kitchen counters and sink",
      "Bathrooms cleaned",
      "Floors vacuumed / mopped",
      "Beds made",
      "Trash taken out",
      "Dust surfaces and furniture",
    ],
  },
  {
    name: "Deep",
    items: [
      "Kitchen counters and sink",
      "Bathrooms cleaned",
      "Floors vacuumed / mopped",
      "Beds made",
      "Trash taken out",
      "Dust surfaces and furniture",
      "Inside oven",
      "Inside refrigerator",
      "Baseboards",
      "Window sills",
      "Light fixtures",
      "Behind furniture (where reachable)",
    ],
  },
  {
    name: "Move-out",
    items: [
      "Kitchen counters and sink",
      "Bathrooms cleaned",
      "Floors vacuumed / mopped",
      "Beds made",
      "Trash taken out",
      "Dust surfaces and furniture",
      "Inside oven",
      "Inside refrigerator",
      "Baseboards",
      "Window sills",
      "Light fixtures",
      "Behind furniture (where reachable)",
      "Inside cabinets and drawers",
      "Inside appliances",
      "Walls spot-cleaned",
      "Closets emptied and wiped",
    ],
  },
];

function parseItems(raw: unknown): ChecklistTemplateItem[] {
  if (!raw) return [];
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((x): x is ChecklistTemplateItem => Boolean(x) && typeof x === "object" && "id" in (x as object))
    .map((x) => ({
      id: String(x.id),
      label: String(x.label ?? ""),
      sort_order: Number(x.sort_order ?? 0),
    }));
}

function asChecked(v: unknown) {
  return v === true || v === 1 || v === "1" || v === "t" || v === "true";
}

export async function ensureDefaultTemplates(sql: Sql, ownerId: string): Promise<string> {
  const existing = await sql<{ id: string; name: string }>`
    select id, name from checklist_templates
    where cleaner_user_id = ${ownerId}
    order by sort_order, name
  `;
  if (existing.length) {
    const standard = existing.find((t) => t.name === "Standard") ?? existing[0];
    return standard.id;
  }
  let standardId = "";
  for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
    const tpl = DEFAULT_TEMPLATES[i];
    const id = nid("tpl");
    if (tpl.name === "Standard") standardId = id;
    await sql`
      insert into checklist_templates (id, cleaner_user_id, name, sort_order)
      values (${id}, ${ownerId}, ${tpl.name}, ${i})
    `;
    for (let n = 0; n < tpl.items.length; n++) {
      await sql`
        insert into checklist_template_items (id, template_id, label, sort_order)
        values (${nid("tli")}, ${id}, ${tpl.items[n]}, ${n})
      `;
    }
  }
  return standardId;
}

export async function standardTemplateId(sql: Sql, ownerId: string) {
  const rows = await sql<{ id: string }>`
    select id from checklist_templates
    where cleaner_user_id = ${ownerId} and name = ${"Standard"}
    order by sort_order
    limit 1
  `;
  if (rows[0]) return rows[0].id;
  return ensureDefaultTemplates(sql, ownerId);
}

export async function copyTemplateToJob(
  sql: Sql,
  ownerId: string,
  jobId: string,
  templateId: string | null | undefined,
) {
  await ensureDefaultTemplates(sql, ownerId);
  const tid = templateId || (await standardTemplateId(sql, ownerId));
  const owned = await sql<{ id: string }>`
    select id from checklist_templates
    where id = ${tid} and cleaner_user_id = ${ownerId}
    limit 1
  `;
  if (!owned[0]) throw new Error("Checklist template not found.");
  const items = await sql<{ label: string; sort_order: number }>`
    select label, sort_order from checklist_template_items
    where template_id = ${tid}
    order by sort_order, label
  `;
  await sql`delete from job_checklist_items where job_id = ${jobId}`;
  for (const item of items) {
    await sql`
      insert into job_checklist_items (id, job_id, label, sort_order, checked)
      values (${nid("jci")}, ${jobId}, ${item.label}, ${item.sort_order}, ${0})
    `;
  }
  await sql`
    update jobs set checklist_template_id = ${tid} where id = ${jobId} and cleaner_user_id = ${ownerId}
  `;
}

/** New jobs inherit the client's default template, else Standard. */
export async function inheritChecklistForNewJob(
  sql: Sql,
  ownerId: string,
  clientId: string,
  jobId: string,
  templateId?: string | null,
) {
  await ensureDefaultTemplates(sql, ownerId);
  let tid = templateId || null;
  if (!tid) {
    const rows = await sql<{ checklist_template_id: string | null }>`
      select checklist_template_id from clients
      where id = ${clientId} and cleaner_user_id = ${ownerId}
      limit 1
    `;
    tid = rows[0]?.checklist_template_id ?? null;
  }
  if (!tid) tid = await standardTemplateId(sql, ownerId);
  await copyTemplateToJob(sql, ownerId, jobId, tid);
}

export async function backfillOwnerChecklists(sql: Sql, ownerId: string) {
  const standardId = await ensureDefaultTemplates(sql, ownerId);
  await sql`
    update clients set checklist_template_id = ${standardId}
    where cleaner_user_id = ${ownerId} and checklist_template_id is null
  `;
  const jobs = await sql<{ id: string; client_id: string; checklist_template_id: string | null }>`
    select j.id, j.client_id, j.checklist_template_id
    from jobs j
    where j.cleaner_user_id = ${ownerId}
      and not exists (select 1 from job_checklist_items i where i.job_id = j.id)
  `;
  for (const job of jobs) {
    await inheritChecklistForNewJob(sql, ownerId, job.client_id, job.id, job.checklist_template_id);
  }
}

async function listTemplatesForOwner(sql: Sql, ownerId: string): Promise<ChecklistTemplate[]> {
  await ensureDefaultTemplates(sql, ownerId);
  const rows = await sql.query<
    ChecklistTemplate & { items_json?: unknown }
  >(
    `select t.id, t.name, t.sort_order, t.created_at::text as created_at,
            (select coalesce(json_agg(json_build_object('id', i.id, 'label', i.label, 'sort_order', i.sort_order) order by i.sort_order, i.label), '[]'::json)
               from checklist_template_items i where i.template_id = t.id) as items_json
     from checklist_templates t
     where t.cleaner_user_id = $1
     order by t.sort_order, t.name`,
    [ownerId],
  );
  return rows.map((row) => {
    const { items_json: raw, ...rest } = row;
    return { ...rest, items: parseItems(raw) };
  });
}

async function loadJobItems(sql: Sql, jobId: string): Promise<JobChecklistItem[]> {
  const rows = await sql<JobChecklistItem>`
    select id, job_id, label, sort_order, checked, checked_at::text as checked_at, checked_by_user_id
    from job_checklist_items
    where job_id = ${jobId}
    order by sort_order, label
  `;
  return rows.map((r) => ({ ...r, checked: asChecked(r.checked) }));
}

export const listChecklistTemplates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    return listTemplatesForOwner(sql, masterUserId(actor));
  });

export const createChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string }) => {
    const name = String(input.name || "").trim().slice(0, 80);
    if (!name) throw new Error("Name the checklist.");
    return { name };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    await ensureDefaultTemplates(sql, ownerId);
    const max = await sql<{ n: number }>`
      select coalesce(max(sort_order), -1) as n from checklist_templates where cleaner_user_id = ${ownerId}
    `;
    const id = nid("tpl");
    await sql`
      insert into checklist_templates (id, cleaner_user_id, name, sort_order)
      values (${id}, ${ownerId}, ${data.name}, ${(max[0]?.n ?? -1) + 1})
    `;
    return { id };
  });

export const renameChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; name: string }) => {
    const name = String(input.name || "").trim().slice(0, 80);
    if (!name) throw new Error("Name the checklist.");
    return { id: input.id, name };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    await sql`
      update checklist_templates set name = ${data.name}
      where id = ${data.id} and cleaner_user_id = ${ownerId}
    `;
    return { ok: true };
  });

export const deleteChecklistTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const all = await sql<{ id: string }>`
      select id from checklist_templates where cleaner_user_id = ${ownerId}
    `;
    if (all.length <= 1) throw new Error("Keep at least one checklist.");
    const fallback = await standardTemplateId(sql, ownerId);
    const nextId = fallback === id ? (all.find((t) => t.id !== id)?.id ?? fallback) : fallback;
    await sql`
      update clients set checklist_template_id = ${nextId}
      where cleaner_user_id = ${ownerId} and checklist_template_id = ${id}
    `;
    await sql`
      update jobs set checklist_template_id = ${nextId}
      where cleaner_user_id = ${ownerId} and checklist_template_id = ${id}
    `;
    await sql`delete from checklist_templates where id = ${id} and cleaner_user_id = ${ownerId}`;
    return { ok: true };
  });

export const addChecklistTemplateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { templateId: string; label: string }) => {
    const label = String(input.label || "").trim().slice(0, 160);
    if (!label) throw new Error("Write the checklist item.");
    return { templateId: input.templateId, label };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const owned = await sql<{ id: string }>`
      select id from checklist_templates where id = ${data.templateId} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!owned[0]) throw new Error("Checklist not found.");
    const max = await sql<{ n: number }>`
      select coalesce(max(sort_order), -1) as n from checklist_template_items where template_id = ${data.templateId}
    `;
    const id = nid("tli");
    await sql`
      insert into checklist_template_items (id, template_id, label, sort_order)
      values (${id}, ${data.templateId}, ${data.label}, ${(max[0]?.n ?? -1) + 1})
    `;
    return { id };
  });

export const updateChecklistTemplateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; label: string }) => {
    const label = String(input.label || "").trim().slice(0, 160);
    if (!label) throw new Error("Write the checklist item.");
    return { id: input.id, label };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    await sql`
      update checklist_template_items
      set label = ${data.label}
      where id = ${data.id}
        and template_id in (select id from checklist_templates where cleaner_user_id = ${ownerId})
    `;
    return { ok: true };
  });

export const removeChecklistTemplateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    await sql`
      delete from checklist_template_items
      where id = ${id}
        and template_id in (select id from checklist_templates where cleaner_user_id = ${ownerId})
    `;
    return { ok: true };
  });

export const getJobChecklist = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((jobId: string) => jobId)
  .handler(async ({ context, data: jobId }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const jobs = await sql<{
      id: string;
      cleaner_user_id: string;
      client_id: string;
      checklist_template_id: string | null;
    }>`
      select id, cleaner_user_id, client_id, checklist_template_id
      from jobs where id = ${jobId} limit 1
    `;
    const job = jobs[0];
    if (!job) throw new Error("Visit not found.");
    if (actor.kind === "client" || actor.kind === "client_unlinked" || actor.kind === "none") {
      return {
        visible: false as const,
        items: [] as JobChecklistItem[],
        templateId: null as string | null,
        templates: [] as ChecklistTemplate[],
        canEdit: false,
        canApplyTemplate: false,
      };
    }
    const ownerId = masterUserId(actor);
    if (job.cleaner_user_id !== ownerId) throw new Error("Visit not found.");
    const office = isOffice(actor);
    if (actor.kind === "team") {
      if (actor.disabled) throw new Error("Visit not found.");
      const allowed = await teamCanAccessJob(sql, context.userId, job.id);
      if (!allowed) throw new Error("Visit not found.");
    }
    let items = await loadJobItems(sql, job.id);
    if (!items.length) {
      await inheritChecklistForNewJob(sql, ownerId, job.client_id, job.id, job.checklist_template_id);
      items = await loadJobItems(sql, job.id);
    }
    const templates = office ? await listTemplatesForOwner(sql, ownerId) : [];
    const refreshed = await sql<{ checklist_template_id: string | null }>`
      select checklist_template_id from jobs where id = ${job.id} limit 1
    `;
    return {
      visible: true as const,
      items,
      templateId: refreshed[0]?.checklist_template_id ?? job.checklist_template_id,
      templates,
      canEdit: office || actor.kind === "team",
      canApplyTemplate: office,
    };
  });

export const toggleJobChecklistItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; checked: boolean }) => ({
    id: input.id,
    checked: Boolean(input.checked),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    const rows = await sql<{
      id: string;
      job_id: string;
      cleaner_user_id: string;
    }>`
      select i.id, i.job_id, j.cleaner_user_id
      from job_checklist_items i
      join jobs j on j.id = i.job_id
      where i.id = ${data.id}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Checklist item not found.");
    if (actor.kind === "client" || actor.kind === "none" || actor.kind === "client_unlinked") {
      throw new Error("Not allowed.");
    }
    const ownerId = masterUserId(actor);
    if (row.cleaner_user_id !== ownerId) throw new Error("Checklist item not found.");
    if (actor.kind === "team") {
      if (actor.disabled) throw new Error("Not allowed.");
      const allowed = await teamCanAccessJob(sql, context.userId, row.job_id);
      if (!allowed) throw new Error("Not allowed.");
    } else if (!isOffice(actor)) {
      throw new Error("Not allowed.");
    }
    const checked = data.checked ? 1 : 0;
    const at = data.checked ? new Date().toISOString() : null;
    const by = data.checked ? context.userId : null;
    await sql`
      update job_checklist_items
      set checked = ${checked}, checked_at = ${at}, checked_by_user_id = ${by}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const applyChecklistTemplateToJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; templateId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await getActor(sql, context.userId);
    assertOffice(actor);
    const ownerId = masterUserId(actor);
    const jobs = await sql<{ id: string }>`
      select id from jobs where id = ${data.jobId} and cleaner_user_id = ${ownerId} limit 1
    `;
    if (!jobs[0]) throw new Error("Visit not found.");
    await copyTemplateToJob(sql, ownerId, data.jobId, data.templateId);
    return { ok: true };
  });
