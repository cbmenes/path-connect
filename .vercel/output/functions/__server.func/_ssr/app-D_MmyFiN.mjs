import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { _ as CalendarDays, c as Receipt, f as LogOut, l as MessageSquare, m as CreditCard, n as Users, p as House, r as UserRound, s as Settings, y as Bell } from "../_libs/lucide-react.mjs";
import { n as Wordmark, t as InstallHint } from "./install-hint-BZppmxWE.mjs";
import { b as useNavigate, d as useRouterState, m as Outlet, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { i as signOut } from "./client-B40BzJxt.mjs";
import { n as useCurrentUserState, t as useCurrentUser } from "./use-current-user-DG6UNzh9.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { t as getNavBadges } from "./messages-BnuAbaq7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-D_MmyFiN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppShell({ actor, children }) {
	const user = useCurrentUser();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const badges = useQuery({
		queryKey: ["badges"],
		queryFn: () => getNavBadges(),
		refetchInterval: 2e4
	});
	const unreadMessages = badges.data?.unreadMessages ?? 0;
	const unreadNotes = badges.data?.unreadNotifications ?? 0;
	const isMaster = actor.kind === "cleaner";
	const isTeam = actor.kind === "team";
	const messaging = actor.kind === "cleaner" || actor.kind === "team" && actor.canMessage && !actor.disabled;
	if (isTeam && actor.disabled) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid min-h-dvh place-items-center bg-bg px-4 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { to: "/" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-6 font-display text-3xl text-navy",
					children: "Access disabled"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "Ask the account owner to turn your team login back on."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-6 text-sm text-navy underline",
					onClick: () => void signOut("/"),
					children: "Sign out"
				})
			]
		})
	});
	const nav = isMaster ? [
		{
			to: "/app",
			label: "Home",
			icon: House
		},
		{
			to: "/app/calendar",
			label: "Calendar",
			icon: CalendarDays
		},
		{
			to: "/app/clients",
			label: "Clients",
			icon: Users
		},
		{
			to: "/app/messages",
			label: "Messages",
			icon: MessageSquare,
			badge: unreadMessages
		},
		{
			to: "/app/payments",
			label: "Payments",
			icon: CreditCard
		}
	] : isTeam ? [
		{
			to: "/app",
			label: "Home",
			icon: House
		},
		{
			to: "/app/calendar",
			label: "Calendar",
			icon: CalendarDays
		},
		...messaging ? [{
			to: "/app/messages",
			label: "Messages",
			icon: MessageSquare,
			badge: unreadMessages
		}] : []
	] : [
		{
			to: "/app",
			label: "Home",
			icon: House
		},
		{
			to: "/app/visits",
			label: "Visits",
			icon: CalendarDays
		},
		{
			to: "/app/messages",
			label: "Messages",
			icon: MessageSquare,
			badge: unreadMessages
		},
		{
			to: "/app/receipts",
			label: "Receipts",
			icon: Receipt
		},
		{
			to: "/app/card",
			label: "Card",
			icon: CreditCard
		}
	];
	const name = actor.kind === "cleaner" ? actor.profile.business_name || actor.profile.full_name : actor.kind === "team" ? actor.profile.full_name : actor.kind === "client" || actor.kind === "client_unlinked" ? actor.profile.full_name : user?.displayName || "Account";
	const roleLabel = isMaster ? "Cleaner" : isTeam ? "Team cleaner" : "Client portal";
	const cols = Math.min(5, Math.max(3, nav.length));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-ink md:grid md:grid-cols-[16rem_1fr]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden border-r border-border bg-navy text-paper md:flex md:flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-5 py-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {
								to: "/app",
								light: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-xs uppercase tracking-[0.16em] text-paper/50",
								children: roleLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 truncate text-sm text-paper/90",
								children: name
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "flex flex-1 flex-col gap-1 px-3",
						children: [nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item,
							pathname,
							dark: true
						}, item.to)), isMaster ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item: {
								to: "/app/team",
								label: "Team",
								icon: UserRound
							},
							pathname,
							dark: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item: {
								to: "/app/settings",
								label: "Settings",
								icon: Settings
							},
							pathname,
							dark: true
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item: {
								to: "/app/settings",
								label: "Settings",
								icon: Settings
							},
							pathname,
							dark: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "m-3 flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-paper/70 hover:bg-paper/10 hover:text-paper",
						onClick: () => void signOut("/"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" }), "Sign out"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-dvh flex-col pb-20 md:pb-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex h-14 items-center justify-between gap-2 border-b border-border bg-bg px-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "md:hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { to: "/app" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hidden truncate text-sm text-muted md:block",
							children: name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-1",
							children: [
								isMaster ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/app/team",
									className: "grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden",
									"aria-label": "Team",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "size-5" })
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/app/settings",
									className: "grid size-11 place-items-center rounded-md text-navy hover:bg-secondary md:hidden",
									"aria-label": "Settings",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/app/notifications",
									className: "relative grid size-11 place-items-center rounded-md text-navy hover:bg-secondary",
									"aria-label": "Notifications",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-5" }), unreadNotes > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountBadge, { value: unreadNotes }) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-sm text-muted md:hidden",
									onClick: () => void signOut("/"),
									children: "Sign out"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto w-full max-w-5xl flex-1 px-4 py-6",
					children
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-paper pb-[env(safe-area-inset-bottom)] md:hidden",
				style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
				children: nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
					item,
					pathname,
					compact: true
				}, item.to))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InstallHint, {})
		]
	});
}
function CountBadge({ value }) {
	if (!value) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-sage px-1 text-[10px] font-semibold leading-4 text-paper",
		children: value > 99 ? "99+" : value
	});
}
function NavLink({ item, pathname, dark, compact }) {
	const active = item.to === "/app" ? pathname === "/app" : pathname === item.to || pathname.startsWith(`${item.to}/`);
	const Icon = item.icon;
	const badge = item.badge && item.badge > 0 ? item.badge : 0;
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: item.to,
		className: cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]", active ? "text-navy" : "text-muted"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" }), badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountBadge, { value: badge }) : null]
		}), item.label]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: item.to,
		className: cn("relative flex min-h-11 items-center gap-2 rounded-md px-3 text-sm", dark ? active ? "bg-paper/15 text-paper" : "text-paper/70 hover:bg-paper/10 hover:text-paper" : active ? "bg-secondary text-ink" : "text-muted hover:bg-secondary hover:text-ink"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex-1",
				children: item.label
			}),
			badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold leading-5", dark ? "bg-sage text-paper" : "bg-navy text-paper"),
				children: badge > 99 ? "99+" : badge
			}) : null
		]
	});
}
function AppLayout() {
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const actor = useQuery({
		queryKey: ["actor", user?.id],
		queryFn: () => getMyActor(),
		enabled: Boolean(user)
	});
	(0, import_react.useEffect)(() => {
		if (!user || actor.isPending) return;
		if (actor.data?.kind === "none") navigate({ to: "/onboarding" });
	}, [
		user,
		actor.data,
		actor.isPending,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (actor.data?.kind !== "team") return;
		if (pathname.startsWith("/app/clients") || pathname.startsWith("/app/payments") || pathname.startsWith("/app/team") || pathname.startsWith("/app/jobs/new")) navigate({ to: "/app" });
	}, [
		actor.data?.kind,
		pathname,
		navigate
	]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-bg p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (actor.isPending || !actor.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-bg p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	});
	if (actor.data.kind === "none") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-bg p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		actor: actor.data,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
//#endregion
export { AppLayout as component };
