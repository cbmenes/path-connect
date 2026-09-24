import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME, HELLO_EMAIL, SUPPORT_EMAIL } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export const Route = createFileRoute("/contact")({ component: Contact });

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <SiteChrome>
      <div className="mx-auto max-w-lg px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Contact</h1>
        <p className="mt-2 text-muted">
          Questions about {APP_NAME}, a demo account, or moving the week off a group text. Write{" "}
          <a className="text-navy underline-offset-4 hover:underline" href={`mailto:${HELLO_EMAIL}`}>
            {HELLO_EMAIL}
          </a>{" "}
          or{" "}
          <a className="text-navy underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        {sent ? (
          <p className="mt-8 rounded-xl bg-sage-soft p-5 text-success">Thanks — we have the note and will reply by email.</p>
        ) : (
          <form
            className="mt-8 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success("Message sent.");
            }}
          >
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Email">
              <Input type="email" name="email" required />
            </Field>
            <Field label="Message">
              <Textarea name="message" required />
            </Field>
            <Button type="submit">Send</Button>
          </form>
        )}
      </div>
    </SiteChrome>
  );
}
