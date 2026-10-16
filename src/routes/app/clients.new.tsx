import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { createClient } from "@/lib/sweepbook/clients";
import { actorWritesLocked } from "@/lib/sweepbook/types";
import { PageHeader } from "@/components/app/empty-state";
import { ClientFields } from "@/components/app/client-fields";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/clients/new")({ component: NewClient });

function NewClient() {
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const [busy, setBusy] = useState(false);
  if (actorWritesLocked(actor.data)) {
    return (
      <div className="mx-auto grid max-w-lg gap-4">
        <PageHeader title="Add client" />
        <p className="text-sm text-ink">Your plan is inactive. Resume it in Settings to make changes.</p>
        <Button variant="outline" asChild>
          <Link to="/app/settings" search={{ tab: "plan" }}>Billing</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <PageHeader title="Add client" />
      <ClientFields
        submitting={busy}
        submitLabel="Save client"
        onSubmit={async (input) => {
          setBusy(true);
          try {
            const res = await createClient({ data: input });
            toast.success(res.smsNotice ? `Client added. ${res.smsNotice}` : "Client added.");
            await navigate({ to: "/app/clients/$id", params: { id: res.id } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
