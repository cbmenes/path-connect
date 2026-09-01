import { initials } from "@/lib/utils";
import type { AssigneeRef } from "@/lib/sweepbook/types";

export function AssigneePicker({
  staff,
  selected,
  onChange,
}: {
  staff: { user_id: string; full_name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!staff.length) {
    return <p className="text-sm text-muted">No team cleaners yet. Invite someone from the Team tab.</p>;
  }
  return (
    <div className="grid gap-1.5">
      {staff.map((s) => {
        const on = selected.includes(s.user_id);
        return (
          <label key={s.user_id} className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-secondary">
            <input
              type="checkbox"
              checked={on}
              onChange={() => {
                onChange(on ? selected.filter((id) => id !== s.user_id) : [...selected, s.user_id]);
              }}
            />
            <span className="grid size-8 place-items-center rounded-full bg-navy text-[11px] font-semibold text-paper">
              {initials(s.full_name)}
            </span>
            <span className="text-sm">{s.full_name}</span>
          </label>
        );
      })}
    </div>
  );
}

export function AssigneeChips({ assignees }: { assignees: AssigneeRef[] }) {
  if (!assignees.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {assignees.map((a) => (
        <span
          key={a.user_id}
          title={a.full_name}
          className="grid size-5 place-items-center rounded-full bg-sage text-[9px] font-semibold text-paper"
        >
          {initials(a.full_name)}
        </span>
      ))}
    </span>
  );
}

export function assigneeLabel(assignees: AssigneeRef[]) {
  if (!assignees.length) return "";
  return assignees.map((a) => initials(a.full_name)).join(" ");
}
