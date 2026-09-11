import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  applyChecklistTemplateToJob,
  getJobChecklist,
  toggleJobChecklistItem,
} from "@/lib/sweepbook/checklists";
import { NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function JobChecklist({
  jobId,
  onChanged,
}: {
  jobId: string;
  onChanged?: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["job-checklist", jobId],
    queryFn: () => getJobChecklist({ data: jobId }),
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  if (q.isPending) {
    return <div className="h-24 animate-pulse rounded-xl bg-secondary" />;
  }
  if (q.error || !q.data?.visible) return null;

  const { items, templateId, templates, canEdit, canApplyTemplate } = q.data;
  const done = items.filter((i) => i.checked).length;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["job-checklist", jobId] });
    await onChanged?.();
  }

  return (
    <div className="grid gap-3 rounded-xl bg-secondary p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Job checklist</p>
          <p className="text-xs text-muted">
            {items.length ? `${done} of ${items.length} done` : "No items yet."} · This visit only
          </p>
        </div>
        {canApplyTemplate && templates.length ? (
          <NativeSelect
            className="max-w-40"
            value={templateId ?? ""}
            disabled={applying}
            onChange={async (e) => {
              const next = e.target.value;
              if (!next || next === templateId) return;
              setApplying(true);
              try {
                await applyChecklistTemplateToJob({ data: { jobId, templateId: next } });
                toast.success("Checklist updated for this visit.");
                await refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not apply checklist.");
              } finally {
                setApplying(false);
              }
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
      </div>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <label
              className={cn(
                "flex min-h-11 items-start gap-3 rounded-lg bg-paper px-3 py-2",
                !canEdit && "opacity-80",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-navy"
                checked={item.checked}
                disabled={!canEdit || busyId === item.id}
                onChange={async (e) => {
                  if (!canEdit) return;
                  const checked = e.target.checked;
                  setBusyId(item.id);
                  try {
                    await toggleJobChecklistItem({ data: { id: item.id, checked } });
                    await refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not save.");
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
              <span className={cn("text-sm", item.checked && "text-muted line-through")}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
