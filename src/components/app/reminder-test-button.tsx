import { useState } from "react";
import { toast } from "sonner";
import { sendTestReminder } from "@/lib/sweepbook/reminders";
import { Button } from "@/components/ui/button";

export function ReminderTestButton({
  jobId,
  label = "Send test reminder",
  variant = "outline",
  size,
}: {
  jobId?: string;
  label?: string;
  variant?: "outline" | "ghost" | "primary";
  size?: "sm" | "default";
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await sendTestReminder({ data: jobId ? { jobId } : {} });
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not send test reminder.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Sending…" : label}
    </Button>
  );
}
