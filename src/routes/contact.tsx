import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { submitContact } from "@/lib/sweepbook/contact";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/contact")({ component: Contact });

function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await submitContact({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          message: String(form.get("message") ?? ""),
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send your message. Email support@getcrewweek.com instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <div className="mx-auto max-w-lg px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Contact</h1>
        <p className="mt-2 text-muted">
          Questions about {APP_NAME}, a demo account, or moving the week off a group text. Write{" "}
          <a className="text-navy underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        {sent ? (
          <p className="mt-8 rounded-xl bg-sage-soft p-5 text-success">
            Thanks. Your message was sent. We will reply by email.
          </p>
        ) : (
          <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
            <Field label="Name">
              <Input name="name" required disabled={busy} />
            </Field>
            <Field label="Email">
              <Input type="email" name="email" required disabled={busy} />
            </Field>
            <Field label="Message">
              <Textarea name="message" required disabled={busy} />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send"}
            </Button>
          </form>
        )}
      </div>
    </SiteChrome>
  );
}
