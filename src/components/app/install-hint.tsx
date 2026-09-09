import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("sweepbook-install-dismissed");
    if (narrow && !standalone && !dismissed) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-[4.75rem] z-40 rounded-lg border border-border bg-paper p-3 shadow-card print:hidden md:bottom-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-sage-soft text-navy">
          <Share className="size-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-ink">Install SweepBook</p>
          <p className="text-muted">
            On iPhone, tap Share, then Add to Home Screen. On Android, use the browser menu and Install app.
          </p>
        </div>
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-md text-muted hover:bg-secondary"
          onClick={() => {
            localStorage.setItem("sweepbook-install-dismissed", "1");
            setShow(false);
          }}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
