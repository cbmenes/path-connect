import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listClients } from "@/lib/sweepbook/clients";
import { money } from "@/lib/sweepbook/time";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/clients/")({ component: ClientsPage });

function ClientsPage() {
  const q = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [qtext, setQtext] = useState("");
  const filtered = useMemo(() => {
    const t = qtext.trim().toLowerCase();
    const rows = q.data ?? [];
    if (!t) return rows;
    return rows.filter((c) =>
      [c.name, c.email, c.phone, c.address].some((v) => (v || "").toLowerCase().includes(t)),
    );
  }, [q.data, qtext]);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Clients"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/data" search={{ kind: "clients" }}>
                Download / Import
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app/clients/new">Add client</Link>
            </Button>
          </div>
        }
      />
      <Input placeholder="Search name, phone, email, address" value={qtext} onChange={(e) => setQtext(e.target.value)} />
      {q.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add a household by hand or import a spreadsheet of the people you already clean for."
          action={
            <Button asChild>
              <Link to="/app/clients/new">Add client</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => (
            <Link key={c.id} to="/app/clients/$id" params={{ id: c.id }} className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 shadow-soft">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.address || "No address"} · {c.frequency || "as needed"}
                </p>
              </div>
              <p className="tabular text-sm text-navy">{c.default_price_cents ? money(c.default_price_cents) : ""}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
