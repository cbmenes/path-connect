import { useEffect, useRef, useState } from "react";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  beginStripeCardSetup,
  beginStripeCardSetupByToken,
  finishStripeCardSetup,
  finishStripeCardSetupByToken,
} from "@/lib/sweepbook/payments";

export function StripeCardSetup({
  clientId,
  token,
  source,
  onSaved,
}: {
  clientId?: string;
  token?: string;
  source: "client" | "cleaner";
  onSaved: (card: { brand: string; last4: string }) => void | Promise<void>;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const secretRef = useRef("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function open() {
      try {
        const setup = token
          ? await beginStripeCardSetupByToken({ data: token })
          : await beginStripeCardSetup({ data: { clientId: clientId || "", source } });
        if (cancelled) return;
        secretRef.current = setup.clientSecret;
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(setup.publishableKey, { stripeAccount: setup.accountId });
        if (!stripe || cancelled || !mountRef.current) {
          if (!cancelled) setError("Stripe could not open the card form.");
          return;
        }
        const card = stripe.elements().create("card", {
          style: { base: { fontSize: "16px", color: "#1A2332", "::placeholder": { color: "#8A8478" } } },
        });
        card.mount(mountRef.current);
        card.on("loaderror", (event) => {
          const message = event.error.message;
          setError(!message || /sk_|rk_|pk_|whsec_/i.test(message) ? "Stripe could not open the card form." : message);
          setReady(false);
        });
        cardRef.current = card;
        stripeRef.current = stripe;
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Stripe could not open the card form.");
      }
    }
    void open();
    return () => {
      cancelled = true;
      cardRef.current?.unmount();
      cardRef.current = null;
    };
  }, [clientId, source, token]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const stripe = stripeRef.current;
    const card = cardRef.current;
    if (!stripe || !card || !secretRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmCardSetup(secretRef.current, {
        payment_method: { card, billing_details: { name: name.trim() || undefined } },
      });
      if (result.error) {
        setError(result.error.message || "Stripe could not save this card.");
        return;
      }
      const setupIntentId = result.setupIntent?.id;
      if (!setupIntentId) throw new Error("Stripe has not saved this card.");
      const saved = token
        ? await finishStripeCardSetupByToken({ data: { token, setupIntentId } })
        : await finishStripeCardSetup({ data: { clientId: clientId || "", setupIntentId, source } });
      await onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3">
      <p className="text-sm text-muted">
        Stripe collects the card on this page. CrewWeek stores the brand and last four, not the card number.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!error && !ready ? <p className="text-sm text-muted">Opening the card form…</p> : null}
      <Field label="Cardholder name">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="cc-name" disabled={Boolean(error) && !ready} />
      </Field>
      <div
        ref={mountRef}
        className={error && !ready ? "hidden" : "min-h-11 rounded-md border border-border bg-paper px-3 py-3 shadow-soft"}
      />
      <Button type="submit" disabled={!ready || busy}>
        {busy ? "Saving…" : "Save card"}
      </Button>
    </form>
  );
}
