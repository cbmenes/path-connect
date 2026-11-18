import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Path Connect" },
      {
        name: "description",
        content: "How Path Connect uses Google Analytics and AdMob, and what stays on your device.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="mx-auto min-h-dvh max-w-2xl px-5 py-12 text-ink sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-muted">Path Connect</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted">November 16, 2026</p>

      <div className="mt-10 grid gap-8 text-base leading-relaxed">
        <p>
          This policy covers the Path Connect website and the Path Connect apps for iOS and Android. The apps load the
          same game.
        </p>

        <section className="grid gap-3">
          <h2 className="font-display text-2xl text-ink">No accounts</h2>
          <p>
            Path Connect does not have user accounts. You do not sign in, and the game does not ask for your name,
            email, or phone number. Progress, the daily puzzle record, hint use, and the choice to remove ads stay on
            the device. They are not sent to a Path Connect account.
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-display text-2xl text-ink">Google Analytics</h2>
          <p>
            Path Connect uses Google Analytics 4 to understand how the game is played. Google Analytics receives a page
            view when you open the site or the app, plus gameplay events: starting a level, finishing a level, using a
            hint, and playing the daily puzzle. A level event includes the level number. A hint event includes whether
            you were playing the campaign or the daily puzzle.
          </p>
          <p>
            Along with those events, Google Analytics receives basic technical data from the browser or app, including
            device type, and a random client identifier stored on the device. That identifier groups visits. It is not
            your name. Path Connect does not send precise location.
          </p>
          <p>
            Google’s own policy describes what Analytics does with that data:{" "}
            <a className="font-medium text-navy underline" href="https://policies.google.com/privacy">
              policies.google.com/privacy
            </a>
            .
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-display text-2xl text-ink">AdMob ads</h2>
          <p>
            Path Connect shows advertisements with Google AdMob. Ads can appear between levels and when you ask for an
            extra hint. AdMob may collect device type, an advertising identifier, an IP address, and how you interact
            with an ad, so Google can deliver and measure ads.
          </p>
          <p>
            Buying Remove ads turns those ads off on that device. Google describes how its advertising partners use
            data at{" "}
            <a className="font-medium text-navy underline" href="https://policies.google.com/technologies/partner-sites">
              policies.google.com/technologies/partner-sites
            </a>
            .
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-display text-2xl text-ink">Contact</h2>
          <p>
            Questions about this policy can be sent through the Path Connect project:{" "}
            <a className="font-medium text-navy underline" href="mailto:pathconnectpuzzle@gmail.com">
              pathconnectpuzzle@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-12">
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-navy">
          Back to the game
        </Link>
      </p>
    </article>
  );
}
