import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import {
  addChecklistTemplateItem,
  createChecklistTemplate,
  deleteChecklistTemplate,
  listChecklistTemplates,
  removeChecklistTemplateItem,
  renameChecklistTemplate,
  updateChecklistTemplateItem,
  type ChecklistTemplate,
} from "@/lib/sweepbook/checklists";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/checklists")({ component: ChecklistsPage });

function ChecklistsPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["checklists"], queryFn: () => listChecklistTemplates() });
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
      {q.isPending ? <div className="h-40 animate-pulse rounded-xl bg-secondary" /> : null}
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
