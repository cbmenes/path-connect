import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PublicBookUrl() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/request`);
  }, []);
  return (
    <Card className="grid gap-2">
      <h2 className="font-display text-lg text-navy">Request a clean</h2>
      <p className="text-sm text-muted">
        Share this public form. A submission is a request — it does not add a visit until you accept it.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url} aria-label="Public request form URL" />
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
    </Card>
  );
}
