import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listClients } from "@/lib/sweepbook/clients";
import { checkJobConflicts, type ConflictHit, type JobInput } from "@/lib/sweepbook/jobs";
import { listAssignableStaff } from "@/lib/sweepbook/team";
import { addressPartsFrom } from "@/lib/sweepbook/people";
import { hoursToMinutes, minutesToHours, money, toDatetimeLocalValue } from "@/lib/sweepbook/time";
import type { ClientRow, Recurrence } from "@/lib/sweepbook/types";
import { AddressFields } from "./address-fields";
import { AssigneePicker } from "./assignee-picker";
import { conflictLine, ConflictWarningDialog } from "./conflict-warning";
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
  const [address, setAddress] = useState(addressPartsFrom(initial));
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
  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);
  const [pendingInput, setPendingInput] = useState<JobInput | null>(null);
  const [checking, setChecking] = useState(false);

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
        data: {
          startLocal,
          durationMin,
          ignoreId: initial?.id,
          assignedToUserIds,
          recurrence,
        },
      })
        .then((r) => setConflicts(r.conflicts))
        .catch(() => setConflicts([]));
    }, 250);
    return () => clearTimeout(t);
  }, [startLocal, durationMin, initial?.id, assignedToUserIds, recurrence]);

  function onClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setAddress(addressPartsFrom(c));
      if (c.default_duration_min) setDurationHours(String(minutesToHours(c.default_duration_min)));
      if (c.default_price_cents) setPriceCents(c.default_price_cents);
      if (c.assigned_user_ids) setAssignedToUserIds(c.assigned_user_ids);
    }
  }

  function buildInput(): JobInput {
    return {
      clientId,
      service,
      address: undefined,
      ...address,
      startLocal,
      durationMin,
      priceCents: Number(priceCents),
      notes,
      recurrence,
      assignedToUserIds,
    };
  }

  async function submitNow(input: JobInput) {
    onSubmit(input);
    setPendingInput(null);
  }

  return (
    <>
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const input = buildInput();
        setChecking(true);
        try {
          const res = await checkJobConflicts({
            data: {
              startLocal: input.startLocal,
              durationMin: input.durationMin,
              ignoreId: initial?.id,
              assignedToUserIds: input.assignedToUserIds,
              recurrence: input.recurrence,
            },
          });
          if (res.conflicts.length) {
            setConflicts(res.conflicts);
            setPendingInput(input);
            return;
          }
          await submitNow(input);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not check for overlaps.");
        } finally {
          setChecking(false);
        }
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
      <AddressFields value={address} onChange={setAddress} />
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
      {conflicts.length ? (
        <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
          {conflictLine(conflicts[0])}
          {conflicts.length > 1
            ? ` And ${conflicts.length - 1} more overlap${conflicts.length === 2 ? "" : "s"}.`
            : ""}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting || checking}>
        {checking ? "Checking…" : submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
    <ConflictWarningDialog
      open={Boolean(pendingInput)}
      conflicts={conflicts}
      busy={submitting}
      onBack={() => setPendingInput(null)}
      onSaveAnyway={async () => {
        if (pendingInput) await submitNow(pendingInput);
      }}
    />
    </>
  );
}
