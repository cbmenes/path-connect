import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Home,
  Inbox,
  LogOut,
  MessageSquare,
  Receipt,
  Settings,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getNavBadges } from "@/lib/sweepbook/messages";
import type { Actor } from "@/lib/sweepbook/types";
import { Wordmark } from "@/components/brand/logo";
import { InstallHint } from "./install-hint";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof Home; match?: string; badge?: number };

export function AppShell({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  const user = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useQuery({
    queryKey: ["badges"],
    queryFn: () => getNavBadges(),
    refetchInterval: 20_000,
  });
  const unreadMessages = badges.data?.unreadMessages ?? 0;
  const unreadNotes = badges.data?.unreadNotifications ?? 0;
  const pendingCleans = badges.data?.pendingCleanRequests ?? 0;
  const pendingTimeOff = badges.data?.pendingTimeOff ?? 0;
  const isMaster = actor.kind === "cleaner";
  const isAdmin = actor.kind === "admin";
  const isOffice = isMaster || isAdmin;
  const isTeam = actor.kind === "team";
  const messaging =
    isOffice || (actor.kind === "team" && actor.canMessage && !actor.disabled);

  if ((isTeam || isAdmin) && actor.disabled) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
        <div className="max-w-md">
          <Wordmark to="/" />
          <h1 className="mt-6 font-display text-3xl text-navy">Access disabled</h1>
          <p className="mt-2 text-muted">Ask the account owner to turn this login back on.</p>
          <button type="button" className="mt-6 text-sm text-navy underline" onClick={() => void signOut("/")}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const nav: Item[] = isOffice
    ? [
        { to: "/app", label: "Home", icon: Home },
        { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
        { to: "/app/clients", label: "Clients", icon: Users },
        { to: "/app/messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
        { to: "/app/payments", label: "Payments", icon: CreditCard },
      ]
    : isTeam
      ? [
          { to: "/app", label: "Home", icon: Home },
          { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
          { to: "/app/time-off", label: "Time off", icon: CalendarOff },
          { to: "/app/sheet", label: "Day sheet", icon: ClipboardList },
          ...(messaging
            ? [{ to: "/app/messages", label: "Messages", icon: MessageSquare, badge: unreadMessages }]
            : []),
        ]
      : [
          { to: "/app", label: "Home", icon: Home },
          { to: "/app/visits", label: "Visits", icon: CalendarDays },
          { to: "/app/messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
          { to: "/app/receipts", label: "Receipts", icon: Receipt },
          { to: "/app/card", label: "Card", icon: CreditCard },
        ];

  const name =
    actor.kind === "cleaner"
      ? actor.profile.business_name || actor.profile.full_name
      : actor.kind === "admin" || actor.kind === "team"
        ? actor.profile.full_name
        : actor.kind === "client" || actor.kind === "client_unlinked"
          ? actor.profile.full_name
          : user?.displayName || "Account";

  const roleLabel = isMaster ? "Cleaner" : isAdmin ? "Admin" : isTeam ? "Team cleaner" : "Client portal";
  const cols = Math.min(5, Math.max(3, nav.length));

  return (
    <div className="min-h-dvh bg-bg text-ink md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-navy text-paper print:hidden md:flex md:flex-col">
        <div className="px-5 py-5">
          <Wordmark to="/app" light />
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-paper/50">{roleLabel}</p>
          <p className="mt-1 truncate text-sm text-paper/90">{name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <NavLink key={item.to} item={item} pathname={pathname} dark />
          ))}
          {isOffice ? (
            <>
              <NavLink
                item={{ to: "/app/sheet", label: "Day sheet", icon: ClipboardList }}
                pathname={pathname}
                dark
              />
              <NavLink
                item={{ to: "/app/requests", label: "Booking Form / Requests", icon: Inbox, badge: pendingCleans }}
                pathname={pathname}
                dark
              />
              <NavLink item={{ to: "/app/team", label: "Team", icon: UserRound }} pathname={pathname} dark />
              <NavLink
                item={{ to: "/app/time-off", label: "Time off", icon: CalendarOff, badge: pendingTimeOff }}
                pathname={pathname}
                dark
              />
              <NavLink item={{ to: "/app/checklists", label: "Checklists", icon: ClipboardCheck }} pathname={pathname} dark />
              {isMaster ? (
                <>
                  <NavLink item={{ to: "/app/team-pay", label: "Team pay", icon: Wallet }} pathname={pathname} dark />
                  <NavLink item={{ to: "/app/data", label: "Data", icon: FileSpreadsheet }} pathname={pathname} dark />
                </>
              ) : null}
              <NavLink item={{ to: "/app/settings", label: "Settings", icon: Settings }} pathname={pathname} dark />
            </>
          ) : (
            <NavLink item={{ to: "/app/settings", label: "Settings", icon: Settings }} pathname={pathname} dark />
          )}
        </nav>
        <button
          type="button"
          className="m-3 flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-paper/70 hover:bg-paper/10 hover:text-paper"
          onClick={() => void signOut("/")}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </aside>

      <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border bg-bg px-4 print:hidden">
          <div className="md:hidden">
            <Wordmark to="/app" />
          </div>
          <p className="hidden truncate text-sm text-muted md:block">{name}</p>
          <div className="ml-auto flex items-center gap-1">
            {isOffice ? (
              <>
                <Link
                  to="/app/sheet"
                  className="grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
                  aria-label="Day sheet"
                >
                  <ClipboardList className="size-5" />
                </Link>
                <Link
                  to="/app/requests"
                  className="relative grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
                  aria-label="Booking Form / Requests"
                >
                  <Inbox className="size-5" />
                  {pendingCleans > 0 ? <CountBadge value={pendingCleans} /> : null}
                </Link>
                <Link
                  to="/app/team"
                  className="grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
                  aria-label="Team"
                >
                  <UserRound className="size-5" />
                </Link>
                <Link
                  to="/app/time-off"
                  className="relative grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
                  aria-label="Time off"
                >
                  <CalendarOff className="size-5" />
                  {pendingTimeOff > 0 ? <CountBadge value={pendingTimeOff} /> : null}
                </Link>
                {isMaster ? (
                  <Link
                    to="/app/data"
                    className="grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
                    aria-label="Data"
                  >
                    <FileSpreadsheet className="size-5" />
                  </Link>
                ) : null}
              </>
            ) : null}
            <Link
              to="/app/settings"
              className="grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Link>
            <Link
              to="/app/notifications"
              className="relative grid size-11 place-items-center rounded-md text-navy hover:bg-secondary"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadNotes > 0 ? <CountBadge value={unreadNotes} /> : null}
            </Link>
            <button type="button" className="text-sm text-muted md:hidden" onClick={() => void signOut("/")}>
              Sign out
            </button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 print:max-w-none print:px-2 print:py-0">{children}</div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-paper pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => (
          <NavLink key={item.to} item={item} pathname={pathname} compact />
        ))}
      </nav>
      <InstallHint />
    </div>
  );
}

function CountBadge({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-sage px-1 text-[10px] font-semibold leading-4 text-paper">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function NavLink({
  item,
  pathname,
  dark,
  compact,
}: {
  item: Item;
  pathname: string;
  dark?: boolean;
  compact?: boolean;
}) {
  const active =
    item.to === "/app" ? pathname === "/app" : pathname === item.to || pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;
  const badge = item.badge && item.badge > 0 ? item.badge : 0;
  if (compact) {
    return (
      <Link
        to={item.to}
        className={cn(
          "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
          active ? "text-navy" : "text-muted",
        )}
      >
        <span className="relative">
          <Icon className="size-5" />
          {badge ? <CountBadge value={badge} /> : null}
        </span>
        {item.label}
      </Link>
    );
  }
  return (
    <Link
      to={item.to}
      className={cn(
        "relative flex min-h-11 items-center gap-2 rounded-md px-3 text-sm",
        dark
          ? active
            ? "bg-paper/15 text-paper"
            : "text-paper/70 hover:bg-paper/10 hover:text-paper"
          : active
            ? "bg-secondary text-ink"
            : "text-muted hover:bg-secondary hover:text-ink",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold leading-5",
            dark ? "bg-sage text-paper" : "bg-navy text-paper",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
