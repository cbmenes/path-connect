import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTimeOff } from "@/lib/sweepbook/time-off";
import { timeOffHintForJob } from "@/lib/sweepbook/time-off-overlap";
import type { AssigneeHint } from "./assignee-picker";

export function useTimeOffHints(startAt?: string | Date | null, durationMin?: number) {
  const q = useQuery({
    queryKey: ["time-off", "range"],
    queryFn: () => listTimeOff({ data: { upcomingOnly: false } }),
  });
  return useMemo(() => {
    const hints: Record<string, AssigneeHint> = {};
    if (!startAt || !durationMin || !q.data) return hints;
    const start = typeof startAt === "string" ? new Date(startAt) : startAt;
    const ids = new Set(q.data.map((r) => r.user_id));
    for (const id of ids) {
      const hint = timeOffHintForJob(q.data, id, start, durationMin);
      if (hint) hints[id] = hint;
    }
    return hints;
  }, [q.data, startAt, durationMin]);
}
