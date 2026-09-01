import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listMessageRecipients, listThreads } from "@/lib/sweepbook/messages";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { formatDateTime } from "@/lib/sweepbook/time";
import { EmptyState, PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/messages/")({ component: MessagesPage });

function MessagesPage() {
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["threads"], queryFn: () => listThreads() });
  const threads = q.data ?? [];
  const [compose, setCompose] = useState(false);
  const isClient = actor.data?.kind === "client";

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Messages"
        action={
          <Button onClick={() => setCompose(true)}>New message</Button>
        }
      />
      {q.isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
      ) : threads.length === 0 ? (
        <EmptyState
          title="No threads yet"
          body={isClient ? "Send a note to your cleaner." : "Start a conversation from New message."}
        />
      ) : (
        <div className="grid gap-2">
          {          threads.map((t) => (
            <Link
              key={t.thread_id}
              to="/app/messages/$clientId"
              params={{ clientId: t.thread_id }}
              className="rounded-xl bg-paper px-4 py-3 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{t.title}</p>
                {t.unread ? <span className="rounded-full bg-navy px-2 text-xs text-paper">{t.unread}</span> : null}
              </div>
              {t.subtitle ? <p className="text-xs text-muted">{t.subtitle}</p> : null}
              <p className="truncate text-sm text-muted">{t.last_body}</p>
              <p className="text-xs text-muted">{t.last_at ? formatDateTime(t.last_at) : ""}</p>
            </Link>
          ))}
        </div>
      )}
      <NewMessageDialog open={compose} onOpenChange={setCompose} />
    </div>
  );
}

function NewMessageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const people = useQuery({
    queryKey: ["message-recipients"],
    queryFn: () => listMessageRecipients(),
    enabled: open,
  });
  const [qtext, setQtext] = useState("");
  const filtered = useMemo(() => {
    const t = qtext.trim().toLowerCase();
    const rows = people.data ?? [];
    if (!t) return rows;
    return rows.filter((p) => [p.name, p.subtitle].some((v) => (v || "").toLowerCase().includes(t)));
  }, [people.data, qtext]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQtext("");
      }}
    >
      <DialogContent title="New message">
        <Input
          autoFocus
          placeholder="Type a name to filter"
          value={qtext}
          onChange={(e) => setQtext(e.target.value)}
        />
        <div className="mt-3 grid max-h-80 gap-1 overflow-y-auto">
          {people.isPending ? (
            <div className="h-20 animate-pulse rounded-lg bg-secondary" />
          ) : filtered.length === 0 ? (
            <p className="px-1 py-3 text-sm text-muted">No matches.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rounded-lg px-3 py-3 text-left hover:bg-secondary"
                onClick={() => {
                  onOpenChange(false);
                  void navigate({ to: "/app/messages/$clientId", params: { clientId: p.id } });
                }}
              >
                <p className="font-medium">{p.name}</p>
                {p.subtitle ? <p className="text-xs text-muted">{p.subtitle}</p> : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
