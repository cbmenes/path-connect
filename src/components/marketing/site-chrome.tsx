import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { CrewWeekLogo } from "@/components/brand/logo";
import { APP_HOST, APP_NAME, PUBLIC_SITE, SUPPORT_EMAIL } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { InstallHint } from "@/components/app/install-hint";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <CrewWeekLogo />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="/#scheduling" className="hover:text-ink">
              Scheduling
            </a>
            <a href="/#payments" className="hover:text-ink">
              Payments
            </a>
            <a href="/#portal" className="hover:text-ink">
              Client portal
            </a>
            <a href="/#pricing" className="hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/choose-plan">Get started</Link>
            </Button>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open ? (
          <div className="grid gap-1 border-t border-border px-4 py-3 md:hidden">
            <a className="flex min-h-11 items-center" href="/#scheduling" onClick={() => setOpen(false)}>
              Scheduling
            </a>
            <a className="flex min-h-11 items-center" href="/#payments" onClick={() => setOpen(false)}>
              Payments
            </a>
            <a className="flex min-h-11 items-center" href="/#portal" onClick={() => setOpen(false)}>
              Client portal
            </a>
            <a className="flex min-h-11 items-center" href="/#pricing" onClick={() => setOpen(false)}>
              Pricing
            </a>
            <Button variant="outline" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/choose-plan">Get started</Link>
            </Button>
          </div>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-navy text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <CrewWeekLogo light />
            <p className="mt-3 max-w-sm text-sm text-paper/70">
              Calendar, clients, payments, and messages for cleaning business owners. Your houses and your crew.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="font-medium text-paper">Product</p>
            <Link to="/login" className="text-paper/70 hover:text-paper">
              Log in
            </Link>
            <Link to="/choose-plan" className="text-paper/70 hover:text-paper">
              Get started
            </Link>
            <a href="/#pricing" className="text-paper/70 hover:text-paper">
              Pricing
            </a>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="font-medium text-paper">Company</p>
            <Link to="/about" className="text-paper/70 hover:text-paper">
              About
            </Link>
            <Link to="/privacy" className="text-paper/70 hover:text-paper">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-paper/70 hover:text-paper">
              Terms & Conditions
            </Link>
            <Link to="/sms-consent" className="text-paper/70 hover:text-paper">
              SMS consent
            </Link>
            <Link to="/contact" className="text-paper/70 hover:text-paper">
              Contact
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-paper/70 hover:text-paper">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <p className="border-t border-paper/10 px-4 py-4 text-center text-xs text-paper/50">
          © {new Date().getFullYear()} {APP_NAME}.{" "}
          <a href={PUBLIC_SITE} className="hover:text-paper">
            getcrewweek.com
          </a>
          {" · "}
          <a href={APP_HOST} className="hover:text-paper">
            crewweek.app
          </a>
        </p>
      </footer>
      <InstallHint />
    </div>
  );
}
