import type { Sql } from "@/lib/db";
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


export function parseChecklistItems(raw: unknown): ChecklistTemplateItem[] {
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

export function asChecklistChecked(v: unknown) {
  return v === true || v === 1 || v === "1" || v === "t" || v === "true";
}

export async function listTemplatesForOwner(sql: Sql, ownerId: string): Promise<ChecklistTemplate[]> {
  await ensureDefaultTemplates(sql, ownerId);
  const rows = await sql.query<ChecklistTemplate & { items_json?: unknown }>(
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
    return { ...rest, items: parseChecklistItems(raw) };
  });
}

export async function loadJobChecklistItems(sql: Sql, jobId: string): Promise<JobChecklistItem[]> {
  const rows = await sql<JobChecklistItem>`
    select id, job_id, label, sort_order, checked, checked_at::text as checked_at, checked_by_user_id
    from job_checklist_items
    where job_id = ${jobId}
    order by sort_order, label
  `;
  return rows.map((r) => ({ ...r, checked: asChecklistChecked(r.checked) }));
}
