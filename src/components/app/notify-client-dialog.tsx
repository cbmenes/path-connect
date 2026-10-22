import { useEffect, useState } from "react";
import type { NoticeChannelChoice } from "@/lib/sweepbook/client-notice-copy";
import { parseSmsConsent } from "@/lib/sweepbook/sms-consent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function NotifyClientDialog({
  open,
  onOpenChange,
  title,
  note,
  email,
  smsConsent,
  busy,
  busyLabel = "Sending…",
  onSkip,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  note?: string;
  email?: string | null;
  smsConsent?: string | null;
  busy?: boolean;
  busyLabel?: string;
  onSkip: () => void | Promise<void>;
  onSend: (choice: NoticeChannelChoice) => void | Promise<void>;
}) {
  const emailAvailable = Boolean(email?.includes("@"));
  const smsAvailable = parseSmsConsent(smsConsent) === "confirmed";
  const [emailOn, setEmailOn] = useState(emailAvailable);
  const [smsOn, setSmsOn] = useState(smsAvailable);

  useEffect(() => {
    if (!open) return;
    setEmailOn(emailAvailable);
    setSmsOn(smsAvailable);
  }, [open, emailAvailable, smsAvailable]);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent title={title} className="z-[80]" overlayClassName="z-[80]">
        {note ? <p className="text-sm text-muted">{note}</p> : null}
        <div className={cn("grid gap-2", note ? "mt-4" : "")}>
          <ChannelChoice
            label="Email"
            checked={emailAvailable && emailOn}
            disabled={!emailAvailable || busy}
            unavailable={emailAvailable ? null : "No email address on file."}
            onChange={setEmailOn}
          />
          <ChannelChoice
            label="SMS"
            checked={smsAvailable && smsOn}
            disabled={!smsAvailable || busy}
            unavailable={smsAvailable ? null : "Unavailable until the client consents to SMS."}
            onChange={setSmsOn}
          />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void onSkip()}>
            Don't notify
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void onSend({ email: emailAvailable && emailOn, sms: smsAvailable && smsOn })}
          >
            {busy ? busyLabel : "Send notifications"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelChoice({
  label,
  checked,
  disabled,
  unavailable,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  unavailable?: string | null;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={cn("flex min-h-11 items-start gap-3 rounded-md px-1 py-2 text-sm", disabled ? "text-muted" : "cursor-pointer text-ink")}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className={cn("font-medium", disabled ? "text-muted" : "text-ink")}>{label}</span>
        {unavailable ? <span className="mt-0.5 block text-xs text-muted">{unavailable}</span> : null}
      </span>
    </label>
  );
}
