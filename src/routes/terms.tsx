import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: `Terms & Conditions · ${APP_NAME}` }] }),
  component: Terms,
});

function Terms() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Terms & Conditions</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} is a tool for a cleaning business owner and the people they invite. You are responsible for
            your account, the people you add, and the work you schedule through it.
          </p>
          <p>
            Use {APP_NAME} for your cleaning business. Do not misuse another person’s account, or use the service to
            harass, mislead, or message someone who has not opted in.
          </p>
          <h2 className="mt-4 font-display text-2xl text-navy">SMS Terms</h2>
          <ul className="grid list-disc gap-2 pl-5">
            <li>Message and data rates may apply.</li>
            <li>Message frequency varies based on scheduled cleanings.</li>
            <li>Recipients can opt out at any time by replying STOP.</li>
            <li>Help is available by replying HELP or contacting {SUPPORT_EMAIL}.</li>
          </ul>
        </div>
      </article>
    </SiteChrome>
  );
}
