import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  addChecklistTemplateItem,
  createChecklistTemplate,
  deleteChecklistTemplate,
  getChecklistOffice,
  listChecklistTemplates,
  removeChecklistTemplateItem,
  renameChecklistTemplate,
  setClientChecklistTemplate,
  setClientChecklistTemplatesBulk,
  setTeamChecklists,
  setTeamMemberChecklistAccess,
  updateChecklistTemplateItem,
  type ChecklistTemplate,
} from "@/lib/sweepbook/checklists";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";

export const Route = createFileRoute("/app/checklists")({ component: ChecklistsPage });

function ChecklistsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["checklists"], queryFn: () => listChecklistTemplates() });
  const officeQ = useQuery({ queryKey: ["checklist-office"], queryFn: () => getChecklistOffice() });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const office = actor.data?.kind === "cleaner" || actor.data?.kind === "admin";
  if (actor.data && !office) {
    return <Navigate to="/app" />;
  }

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["checklists"] });
    await qc.invalidateQueries({ queryKey: ["checklist-office"] });
    await qc.invalidateQueries({ queryKey: ["actor"] });
    await qc.invalidateQueries({ queryKey: ["clients"] });
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Office"
        title="Job checklists"
        action={
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const next = name.trim();
              if (!next) return;
              setBusy(true);
              try {
                await createChecklistTemplate({ data: { name: next } });
                setName("");
                toast.success("Checklist added.");
                await refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not add.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New checklist name"
              className="w-44"
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              Add
            </Button>
          </form>
        }
      />
      <p className="max-w-xl text-sm text-muted">
        Templates such as Standard, Deep, and Move-out. Checking items on a visit does not change the template.
      </p>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Team checklists</p>
          <p className="text-sm text-muted">
            {officeQ.data?.teamChecklistsEnabled
              ? "Team can see checklists. You can turn off individual cleaners below."
              : "Team cleaners cannot see checklists."}
          </p>
        </div>
        <Button
          variant={officeQ.data?.teamChecklistsEnabled ? "primary" : "outline"}
          disabled={officeQ.isPending}
          onClick={async () => {
            await setTeamChecklists({ data: !officeQ.data?.teamChecklistsEnabled });
            toast.message(officeQ.data?.teamChecklistsEnabled ? "Team checklists off." : "Team checklists on.");
            await refresh();
          }}
        >
          {officeQ.data?.teamChecklistsEnabled ? "On" : "Off"}
        </Button>
      </Card>

      <Card className="grid gap-3">
        <div>
          <h2 className="font-display text-lg text-navy">Team cleaner access</h2>
          <p className="text-sm text-muted">
            A cleaner sees a job checklist only when Team checklists is On and their row is On.
          </p>
        </div>
        {(officeQ.data?.cleaners ?? []).length ? (
          <ul className="grid gap-2">
            {(officeQ.data?.cleaners ?? []).map((c) => (
              <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
                <p className="text-sm font-medium">{c.full_name}</p>
                <Button
                  size="sm"
                  variant={c.can_see_checklists ? "primary" : "outline"}
                  onClick={async () => {
                    await setTeamMemberChecklistAccess({
                      data: { userId: c.user_id, enabled: !c.can_see_checklists },
                    });
                    toast.message(c.can_see_checklists ? "Checklist access off." : "Checklist access on.");
                    await refresh();
                  }}
                >
                  {c.can_see_checklists ? "On" : "Off"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No team cleaners yet.</p>
        )}
      </Card>

      <ClientTemplateAssign
        clients={officeQ.data?.clients ?? []}
        templates={officeQ.data?.templates ?? q.data ?? []}
        busy={busy}
        onBusy={setBusy}
        onChanged={refresh}
      />

      {q.isPending ? <div className="h-40 animate-pulse rounded-xl bg-secondary" /> : null}
      <h2 className="font-display text-lg text-navy">Templates</h2>
      {!q.isPending && !(q.data ?? []).length ? (
        <EmptyState title="No checklists yet" body="Add Standard, Deep, or a custom list." />
      ) : null}
      <div className="grid gap-4">
        {(q.data ?? []).map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            canDelete={(q.data ?? []).length > 1}
            onDelete={() => setDeleteId(tpl.id)}
            onChanged={refresh}
          />
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this checklist?"
        body="Clients using it will fall back to another template. Visit checklists already copied onto jobs stay as they are."
        confirmLabel="Delete checklist"
        busyLabel="Deleting…"
        busy={busy}
        onConfirm={async () => {
          if (!deleteId) return;
          setBusy(true);
          try {
            await deleteChecklistTemplate({ data: deleteId });
            toast.message("Checklist deleted.");
            setDeleteId(null);
            await refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function ClientTemplateAssign({
  clients,
  templates,
  busy,
  onBusy,
  onChanged,
}: {
  clients: { id: string; name: string; checklist_template_id: string | null }[];
  templates: ChecklistTemplate[];
  busy: boolean;
  onBusy: (v: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkId, setBulkId] = useState("");

  function toggle(id: string, on: boolean) {
    setSelected((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  return (
    <Card className="grid gap-3">
      <div>
        <h2 className="font-display text-lg text-navy">Assign templates to clients</h2>
        <p className="text-sm text-muted">
          New and future jobs use this list. Checks already saved on past visits stay as they are.
        </p>
      </div>
      {clients.length && selected.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Set selected to">
            <NativeSelect value={bulkId} onChange={(e) => setBulkId(e.target.value)}>
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              onBusy(true);
              try {
                await setClientChecklistTemplatesBulk({
                  data: { clientIds: selected, templateId: bulkId || null },
                });
                toast.success("Templates updated for selected clients.");
                setSelected([]);
                await onChanged();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not update.");
              } finally {
                onBusy(false);
              }
            }}
          >
            Apply to {selected.length}
          </Button>
        </div>
      ) : null}
      {clients.length ? (
        <ul className="grid gap-2">
          {clients.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 accent-navy"
                  checked={selected.includes(c.id)}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                <span className="truncate text-sm font-medium">{c.name}</span>
              </label>
              <NativeSelect
                className="max-w-44"
                value={c.checklist_template_id ?? ""}
                disabled={busy}
                onChange={async (e) => {
                  const next = e.target.value || null;
                  onBusy(true);
                  try {
                    await setClientChecklistTemplate({ data: { clientId: c.id, templateId: next } });
                    toast.success("Client checklist saved.");
                    await onChanged();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not save.");
                  } finally {
                    onBusy(false);
                  }
                }}
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Add clients first, then assign a checklist.</p>
      )}
    </Card>
  );
}

function TemplateCard({
  template,
  canDelete,
  onDelete,
  onChanged,
}: {
  template: ChecklistTemplate;
  canDelete: boolean;
  onDelete: () => void;
  onChanged: () => Promise<void>;
}) {
  const [title, setTitle] = useState(template.name);
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Field label="Name">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={async () => {
                const next = title.trim();
                if (!next || next === template.name) {
                  setTitle(template.name);
                  return;
                }
                try {
                  await renameChecklistTemplate({ data: { id: template.id, name: next } });
                  await onChanged();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not rename.");
                  setTitle(template.name);
                }
              }}
            />
          </Field>
        </div>
        {canDelete ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {template.items.map((row) => (
          <TemplateItemRow key={row.id} id={row.id} label={row.label} onChanged={onChanged} />
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const label = item.trim();
          if (!label) return;
          setBusy(true);
          try {
            await addChecklistTemplateItem({ data: { templateId: template.id, label } });
            setItem("");
            await onChanged();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not add item.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Add a checkbox item" />
        <Button type="submit" variant="outline" disabled={busy || !item.trim()}>
          Add item
        </Button>
      </form>
    </Card>
  );
}

function TemplateItemRow({
  id,
  label,
  onChanged,
}: {
  id: string;
  label: string;
  onChanged: () => Promise<void>;
}) {
  const [value, setValue] = useState(label);
  const [busy, setBusy] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={async () => {
          const next = value.trim();
          if (!next || next === label) {
            setValue(label);
            return;
          }
          try {
            await updateChecklistTemplateItem({ data: { id, label: next } });
            await onChanged();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
            setValue(label);
          }
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await removeChecklistTemplateItem({ data: id });
            await onChanged();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Remove
      </Button>
    </li>
  );
}
