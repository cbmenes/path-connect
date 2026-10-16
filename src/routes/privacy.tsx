import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: `Privacy Policy · ${APP_NAME}` }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl text-navy">Privacy Policy</h1>
        <div className="mt-6 grid gap-4 text-muted">
          <p>
            {APP_NAME} collects basic contact information (name, phone, and email) from clients and team members for
            operational purposes. That information is used to run scheduling, household notes, and messages for the
            cleaning business that invited them.
          </p>
          <p>
            We use phone numbers only to send appointment reminders, on-my-way alerts, and cancellation notices when
            the recipient has opted in.
          </p>
          <p>
            We do not sell or share your SMS opt-in data or personal information with third parties for marketing
            purposes.
          </p>
          <p>Questions: {SUPPORT_EMAIL}.</p>
        </div>
      </article>
    </SiteChrome>
  );
}
