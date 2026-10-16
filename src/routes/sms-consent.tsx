import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { SmsConsentForm } from "@/components/app/sms-opt-in";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { APP_NAME } from "@/lib/brand";

const EXAMPLE_COMPANY = "Example Cleaning Co.";

export const Route = createFileRoute("/sms-consent")({
  head: () => ({
    meta: [
      { title: `SMS consent · ${APP_NAME}` },
      {
        name: "description",
        content: "Example of how a client opts in to SMS appointment messages.",
      },
    ],
  }),
  component: SmsConsentExample,
});

function SmsConsentExample() {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-md px-4 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage">Example</p>
        <h1 className="mt-2 font-display text-4xl text-navy">SMS consent</h1>
        <p className="mt-4 text-sm text-muted">
          This is how clients opt in. The checkbox and wording below match the form a client submits from their own
          consent link. Submitting this example does not enroll a phone number.
        </p>
        <div className="mt-6 rounded-xl bg-paper p-5 shadow-card">
          <SmsConsentForm
            companyName={EXAMPLE_COMPANY}
            clientName="Alex Rivera"
            phone="(405) 555-0100"
            submitLabel="Submit"
            onSubmit={(agreed) => {
              if (!agreed) {
                toast.error("Check the box to opt in.");
                return;
              }
              toast("This example does not save a consent.");
            }}
          />
        </div>
      </article>
    </SiteChrome>
  );
}
