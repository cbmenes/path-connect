import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getThread, sendMessage } from "@/lib/sweepbook/messages";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { formatDateTime } from "@/lib/sweepbook/time";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/messages/$clientId")({ component: ThreadPage });

function ThreadPage() {
  const { clientId: threadId } = Route.useParams();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["thread", threadId], queryFn: () => getThread({ data: threadId }) });
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [q.data?.messages.length]);

  useEffect(() => {
    if (q.data) {
      void qc.invalidateQueries({ queryKey: ["badges"] });
      void qc.invalidateQueries({ queryKey: ["threads"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [q.data, qc]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col">
      <h1 className="font-display text-2xl text-navy">{q.data?.title || "Messages"}</h1>
      {q.data?.subtitle ? <p className="text-sm text-muted">{q.data.subtitle}</p> : null}
      {q.error ? (
        <p className="mt-4 text-sm text-danger">{(q.error as Error).message || "This conversation is not available."}</p>
      ) : null}
      <div className="mt-4 flex-1 space-y-2">
        {(q.data?.messages ?? []).map((m) => {
          const mine = m.sender_user_id ? m.sender_user_id === actor.data?.userId : false;
          const name = m.sender_name || (m.sender_role === "client" ? "Client" : "Cleaner");
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", mine ? "bg-navy text-paper" : "bg-paper shadow-soft")}>
                <p className={cn("text-[11px] font-medium", mine ? "text-paper/70" : "text-sage")}>{name}</p>
                <p>{m.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-paper/60" : "text-muted")}>{formatDateTime(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        className="sticky bottom-0 mt-4 grid gap-2 bg-bg py-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!threadId || q.error || !q.data) {
            toast.error("Choose who to message.");
            return;
          }
          try {
            await sendMessage({ data: { threadId, body } });
            setBody("");
            await qc.invalidateQueries({ queryKey: ["thread", threadId] });
            await qc.invalidateQueries({ queryKey: ["threads"] });
            await qc.invalidateQueries({ queryKey: ["badges"] });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not send.");
          }
        }}
      >
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" rows={3} disabled={Boolean(q.error) || !q.data} />
        <Button type="submit" disabled={Boolean(q.error) || !q.data || !body.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
