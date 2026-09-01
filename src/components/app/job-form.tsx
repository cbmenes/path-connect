import { useEffect, useState } from "react";
import { listClients } from "@/lib/sweepbook/clients";
import { checkJobConflicts, type JobInput } from "@/lib/sweepbook/jobs";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import { hoursToMinutes, minutesToHours, money, toDatetimeLocalValue } from "@/lib/sweepbook/time";
import type { ClientRow, Recurrence } from "@/lib/sweepbook/types";
import { AssigneePicker } from "./assignee-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export function JobForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
  showAssign,
}: {
  initial?: Partial<JobInput> & { id?: string };
  onSubmit: (input: JobInput) => void;
  submitting?: boolean;
  submitLabel: string;
  showAssign?: boolean;
}) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; full_name: string }[]>([]);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [service, setService] = useState(initial?.service ?? "House cleaning");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [startLocal, setStartLocal] = useState(initial?.startLocal ?? toDatetimeLocalValue(new Date()));
  const [durationHours, setDurationHours] = useState(
    String(minutesToHours(initial?.durationMin ?? 120) || 2),
  );
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 15000);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? "none");
  const [assignedToUserIds, setAssignedToUserIds] = useState<string[]>(
    initial?.assignedToUserIds ?? (initial?.assignedToUserId ? [initial.assignedToUserId] : []),
  );
  const [conflicts, setConflicts] = useState(0);

  useEffect(() => {
    void listClients().then(setClients).catch(() => setClients([]));
    if (showAssign) {
      void listAssignableStaff()
        .then(setStaff)
        .catch(() => setStaff([]));
    }
  }, [showAssign]);

  useEffect(() => {
    if (!clientId || assignedToUserIds.length) return;
    const c = clients.find((x) => x.id === clientId);
    if (c?.assigned_user_ids?.length) setAssignedToUserIds(c.assigned_user_ids);
  }, [clients, clientId, assignedToUserIds.length]);

  const durationMin = hoursToMinutes(Number(durationHours) || 0);

  useEffect(() => {
    const t = setTimeout(() => {
      void checkJobConflicts({
        data: { startLocal, durationMin, ignoreId: initial?.id, assignedToUserIds },
      })
        .then((r) => setConflicts(r.conflicts.length))
        .catch(() => setConflicts(0));
    }, 250);
    return () => clearTimeout(t);
  }, [startLocal, durationMin, initial?.id, assignedToUserIds]);

  function onClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      if (c.address) setAddress(c.address);
      if (c.default_duration_min) setDurationHours(String(minutesToHours(c.default_duration_min)));
      if (c.default_price_cents) setPriceCents(c.default_price_cents);
      if (c.assigned_user_ids) setAssignedToUserIds(c.assigned_user_ids);
    }
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          clientId,
          service,
          address,
          startLocal,
          durationMin,
          priceCents: Number(priceCents),
          notes,
          recurrence,
          assignedToUserIds,
        });
      }}
    >
      <Field label="Client">
        <NativeSelect value={clientId} onChange={(e) => onClient(e.target.value)} required>
          <option value="">Select a client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Service">
        <Input value={service} onChange={(e) => setService(e.target.value)} />
      </Field>
      <Field label="Address">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Date and time">
        <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (hours)" hint="Half-hour steps. Examples: 1, 1.5, 2, 2.5, 3">
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
          />
        </Field>
        <Field label="Price" hint={money(Number(priceCents) || 0)}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={(Number(priceCents) / 100).toFixed(2)}
            onChange={(e) => setPriceCents(Math.round(Number(e.target.value) * 100))}
          />
        </Field>
      </div>
      <Field label="Repeat">
        <NativeSelect value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          <option value="none">One-off</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every other week</option>
          <option value="monthly">Monthly</option>
        </NativeSelect>
      </Field>
      {showAssign ? (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium text-ink">Assigned cleaners</p>
          <p className="text-xs text-muted">If this is a recurring cleaning, the cleaner(s) you choose below will be assigned to future recurring appointments on this schedule.</p>
          <AssigneePicker staff={staff} selected={assignedToUserIds} onChange={setAssignedToUserIds} />
        </div>
      ) : null}
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {conflicts > 0 ? (
        <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
          This overlaps {conflicts} other visit{conflicts === 1 ? "" : "s"} on your book. You can still save it.
        </p>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
