import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/sweepbook/clients";
import { PageHeader } from "@/components/app/empty-state";
import { ClientFields } from "@/components/app/client-fields";

export const Route = createFileRoute("/app/clients/new")({ component: NewClient });

function NewClient() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
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
            toast.success("Client added.");
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
