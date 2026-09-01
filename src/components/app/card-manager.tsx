import { useState } from "react";
import { toast } from "sonner";
import { addCardAuthenticated, removeCard, setDefaultCard } from "@/lib/sweepbook/payments";
import { brandLabel } from "@/lib/sweepbook/card-utils";
import type { CardRow } from "@/lib/sweepbook/types";
import { CardForm } from "./card-form";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/input";

export function CardSelect({
  cards,
  value,
  onChange,
}: {
  cards: Pick<CardRow, "id" | "brand" | "last4" | "is_default">[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (!cards.length) {
    return <p className="text-sm text-muted">No card on file yet. Add one first.</p>;
  }
  const preferred = cards.find((c) => c.is_default)?.id ?? cards[0]?.id ?? "";
  return (
    <Field label="Charge card" hint="Default is used unless you pick another.">
      <NativeSelect value={value || preferred} onChange={(e) => onChange(e.target.value)}>
        {cards.map((c) => (
          <option key={c.id} value={c.id}>
            {brandLabel(c.brand)} · {c.last4}
            {c.is_default ? " (default)" : ""}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function CardManager({
  clientId,
  cards,
  source,
  onChange,
}: {
  clientId: string;
  cards: CardRow[];
  source: "client" | "cleaner";
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removing = cards.find((c) => c.id === removeId);

  return (
    <div className="grid gap-3">
      {cards.length === 0 ? <p className="text-sm text-muted">No card on file yet.</p> : null}
      {cards.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">
              {brandLabel(c.brand)} · {c.last4}
            </p>
            <p className="text-xs text-muted">
              {c.is_default ? "Default" : c.source === "client" ? "Client card" : "Backup"}
              {c.exp_month && c.exp_year ? ` · ${c.exp_month}/${c.exp_year}` : ""}
              {c.failing ? " · Needs update" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!c.is_default ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === c.id}
                onClick={async () => {
                  setBusy(c.id);
                  try {
                    await setDefaultCard({ data: { cardId: c.id, clientId } });
                    toast.success("Default card updated.");
                    await onChange();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not update.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Set as default
              </Button>
            ) : (
              <span className="rounded-full bg-sage-soft px-2 py-1 text-xs text-success">Preferred</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === c.id}
              onClick={() => setRemoveId(c.id)}
            >
              Remove
            </Button>
          </div>
        </Card>
      ))}
      {adding ? (
        <Card>
          <h3 className="mb-3 font-display text-lg text-navy">Add a new card</h3>
          <CardForm
            submitLabel="Save card securely"
            onSubmit={async (payload) => {
              const saved = await addCardAuthenticated({
                data: { ...payload, clientId, source },
              });
              toast.success(`Saved ${brandLabel(saved.brand)} · ${saved.last4}`);
              setAdding(false);
              await onChange();
            }}
          />
          <Button variant="ghost" className="mt-2" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          Replace / add new card
        </Button>
      )}
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title="Remove card?"
        body={`Are you sure you want to remove ${removing ? `${brandLabel(removing.brand)} ••••${removing.last4}` : "this card"}? This cannot be undone.`}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(removing.id);
          try {
            await removeCard({ data: { cardId: removing.id, clientId } });
            toast.message("Card removed.");
            setRemoveId(null);
            await onChange();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove.");
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}
