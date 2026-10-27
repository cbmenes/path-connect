import { useEffect, useRef, useState } from "react";

function safeMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  if (!raw || /sk_|rk_|pk_|whsec_/i.test(raw)) return "Stripe could not open the payment form.";
  return raw;
}

/** Stripe Checkout mounted on this site. Card numbers stay in Stripe. */
export function EmbeddedCheckoutForm({
  clientSecret,
  publishableKey,
}: {
  clientSecret: string;
  publishableKey: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let checkout: { destroy: () => void } | null = null;
    async function open() {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(publishableKey);
        if (!stripe || cancelled) {
          if (!cancelled) setError("Stripe could not open the payment form.");
          return;
        }
        const page = await stripe.createEmbeddedCheckoutPage({ clientSecret });
        if (cancelled) {
          page.destroy();
          return;
        }
        if (!mountRef.current) {
          page.destroy();
          setError("Stripe could not open the payment form.");
          return;
        }
        page.mount(mountRef.current);
        checkout = page;
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(safeMessage(err));
      }
    }
    void open();
    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey]);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Pay on this page. Stripe collects the card. After payment, this page continues to the welcome screen.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!error && !ready ? <p className="text-sm text-muted">Opening the payment form…</p> : null}
      <div ref={mountRef} className={error ? "hidden" : "min-h-40"} />
    </div>
  );
}
