import { useEffect, useState } from "react";
import type { TimeOffKind } from "@/lib/sweepbook/time-off-overlap";
import { chicagoDateInputValue } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export type TimeOffFormValue = {
  userId?: string;
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

export function TimeOffForm({
  people,
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  people?: { user_id: string; full_name: string; kind?: string }[];
  initial?: Partial<TimeOffFormValue>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (value: TimeOffFormValue) => void | Promise<void>;
}) {
  const today = chicagoDateInputValue();
  const [userId, setUserId] = useState(initial?.userId ?? people?.[0]?.user_id ?? "");
  const [kind, setKind] = useState<TimeOffKind>(initial?.kind ?? "all_day");
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [endDate, setEndDate] = useState(initial?.endDate ?? today);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "17:00");
  const [note, setNote] = useState(initial?.note ?? "");

  useEffect(() => {
    if (!people?.length) return;
    if (!people.some((person) => person.user_id === userId)) setUserId(people[0].user_id);
  }, [people, userId]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({ userId, kind, startDate, endDate, startTime, endTime, note });
      }}
    >
      {people?.length ? (
        <Field label="Cleaner">
          <NativeSelect value={userId} onChange={(e) => setUserId(e.target.value)} required>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.full_name}
                {p.kind === "master" ? " (owner)" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Field label="When">
        <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as TimeOffKind)}>
          <option value="all_day">All day</option>
          <option value="range">Time range</option>
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="End date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
      </div>
      {kind === "range" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="End time">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </Field>
        </div>
      ) : null}
      <Field label="Note" hint="Optional">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
