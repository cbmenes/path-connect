import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">About</p>
        <h1 className="mt-2 font-display text-4xl text-navy">
          Scheduling and payments for cleaning company owners.
        </h1>
        <p className="mt-4 text-lg text-ink">Stop running your appointments from group texts and spreadsheets.</p>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} is owner operations software for residential cleaning companies. Schedule weekly appointments and
            one-offs, assign your crew, keep pay rates private, and let clients check visits and pay through their
            own portal. It is not a marketplace. Plans start at $39/month.
          </p>
        </div>
      </article>
    </SiteChrome>
  );
}
