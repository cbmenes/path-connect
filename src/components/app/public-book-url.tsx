import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getBookingLink } from "@/lib/sweepbook/requests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PublicBookUrl() {
  const q = useQuery({ queryKey: ["booking-link"], queryFn: () => getBookingLink() });
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!q.data?.path) return;
    setUrl(`${window.location.origin}${q.data.path}`);
  }, [q.data?.path]);
  return (
    <Card className="grid gap-2">
      <h2 className="font-display text-lg text-navy">Public booking form</h2>
      <p className="text-sm text-muted">
        This company’s unique link. A submission is a request — it does not add a visit until you accept it.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url || (q.isPending ? "Loading…" : "")} aria-label="Public booking form URL" />
        <Button
          type="button"
          variant="outline"
          disabled={!url}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied.");
            } catch {
              toast.error("Could not copy the link.");
            }
          }}
        >
          Copy link
        </Button>
      </div>
      {q.data?.path ? <p className="text-xs text-muted">{q.data.path}</p> : null}
    </Card>
  );
}
