import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { i as TriangleAlert } from "../_libs/lucide-react.mjs";
import { _ as createRootRoute, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as __exportAll } from "./ssr.mjs";
import { L as string, N as number, P as object, R as union, j as literal } from "../_libs/@better-auth/core+[...].mjs";
import { n as auth } from "./server-0DItOaLd.mjs";
import { n as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CXlM22XK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-ZUXwY_Lr.css";
var APP_NAME = "SweepBook";
var queryClient = new QueryClient({ defaultOptions: { queries: {
	staleTime: 8e3,
	retry: 1
} } });
var Route$32 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "SweepBook helps independent house cleaners run scheduling, client records, messaging, and payments. Clients get a simple portal. $19/month."
			},
			{
				name: "theme-color",
				content: "#1B365D"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
			}
		]
	}),
	component: Root
});
function Root() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
				client: queryClient,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					richColors: true,
					position: "top-center"
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter$30 = () => import("./routes-DdnqxFR9.mjs");
var Route$31 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$30, "component") });
var $$splitComponentImporter$29 = () => import("./about-DCYvm-cy.mjs");
var Route$30 = createFileRoute("/about")({ component: lazyRouteComponent($$splitComponentImporter$29, "component") });
var $$splitComponentImporter$28 = () => import("./app-D_MmyFiN.mjs");
var Route$29 = createFileRoute("/app")({ component: lazyRouteComponent($$splitComponentImporter$28, "component") });
var $$splitComponentImporter$27 = () => import("./contact-CeKSc7tn.mjs");
var Route$28 = createFileRoute("/contact")({ component: lazyRouteComponent($$splitComponentImporter$27, "component") });
var $$splitComponentImporter$26 = () => import("./login-8PeKbY6D.mjs");
var Route$27 = createFileRoute("/login")({
	validateSearch: (s) => ({ demo: s.demo === "client" || s.demo === "cleaner" || s.demo === "team" ? s.demo : void 0 }),
	component: lazyRouteComponent($$splitComponentImporter$26, "component")
});
var $$splitComponentImporter$25 = () => import("./onboarding-B_vi0urj.mjs");
var Route$26 = createFileRoute("/onboarding")({ component: lazyRouteComponent($$splitComponentImporter$25, "component") });
var $$splitComponentImporter$24 = () => import("./privacy-BvBk02JU.mjs");
var Route$25 = createFileRoute("/privacy")({ component: lazyRouteComponent($$splitComponentImporter$24, "component") });
var $$splitComponentImporter$23 = () => import("./signup-BmQSCnR9.mjs");
var Route$24 = createFileRoute("/signup")({ component: lazyRouteComponent($$splitComponentImporter$23, "component") });
var $$splitComponentImporter$22 = () => import("./terms-DBP8JvO_.mjs");
var Route$23 = createFileRoute("/terms")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
var $$splitComponentImporter$21 = () => import("./add-card._token-CXUXxw7b.mjs");
var Route$22 = createFileRoute("/add-card/$token")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./app-C6D5r76n.mjs");
var Route$21 = createFileRoute("/app/")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./calendar-2mWQiedL.mjs");
var Route$20 = createFileRoute("/app/calendar")({
	validateSearch: (s) => ({
		view: s.view === "day" || s.view === "month" || s.view === "week" ? s.view : void 0,
		date: typeof s.date === "string" ? s.date : void 0,
		start: typeof s.start === "string" ? s.start : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$19, "component")
});
var $$splitComponentImporter$18 = () => import("./card-B5C46y9O.mjs");
var Route$19 = createFileRoute("/app/card")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./clients-CBau8xIA.mjs");
var Route$18 = createFileRoute("/app/clients")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./messages-C6oBWkOc.mjs");
var Route$17 = createFileRoute("/app/messages")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./notifications-CS87QIM8.mjs");
var Route$16 = createFileRoute("/app/notifications")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./payments-cfZ37ZnP.mjs");
var Route$15 = createFileRoute("/app/payments")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./receipts-WXz3mYfX.mjs");
var Route$14 = createFileRoute("/app/receipts")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./settings-BV29dUf7.mjs");
var Route$13 = createFileRoute("/app/settings")({
	validateSearch: (s) => ({ tab: s.tab === "account" || s.tab === "billing" || s.tab === "profile" ? s.tab : void 0 }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./team-By61VEG7.mjs");
var Route$12 = createFileRoute("/app/team")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./visits-CyMLe27I.mjs");
var Route$11 = createFileRoute("/app/visits")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./invite._token-rr24Jyxr.mjs");
var Route$10 = createFileRoute("/invite/$token")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./team-invite._token-D5yvFLbD.mjs");
var Route$9 = createFileRoute("/team-invite/$token")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var Route$8 = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var $$splitComponentImporter$7 = () => import("./clients.index-DTcMmaPC.mjs");
var Route$7 = createFileRoute("/app/clients/")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./clients._id-D-MElYzR.mjs");
var Route$6 = createFileRoute("/app/clients/$id")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./clients.import-dJkTHq3o.mjs");
var Route$5 = createFileRoute("/app/clients/import")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./clients.new-Ca34hmKr.mjs");
var Route$4 = createFileRoute("/app/clients/new")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./jobs._id-CjlUu7v0.mjs");
var Route$3 = createFileRoute("/app/jobs/$id")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./jobs.new-778QgKIF.mjs");
var Route$2 = createFileRoute("/app/jobs/new")({
	validateSearch: (s) => ({
		start: typeof s.start === "string" ? s.start : void 0,
		clientId: typeof s.clientId === "string" ? s.clientId : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./messages.index-DnUlBqyc.mjs");
var Route$1 = createFileRoute("/app/messages/")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./messages._clientId-DWpSaQfO.mjs");
var Route = createFileRoute("/app/messages/$clientId")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var IndexRoute = Route$31.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$32
});
var AboutRoute = Route$30.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => Route$32
});
var AppRoute = Route$29.update({
	id: "/app",
	path: "/app",
	getParentRoute: () => Route$32
});
var ContactRoute = Route$28.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => Route$32
});
var LoginRoute = Route$27.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$32
});
var OnboardingRoute = Route$26.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => Route$32
});
var PrivacyRoute = Route$25.update({
	id: "/privacy",
	path: "/privacy",
	getParentRoute: () => Route$32
});
var SignupRoute = Route$24.update({
	id: "/signup",
	path: "/signup",
	getParentRoute: () => Route$32
});
var TermsRoute = Route$23.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => Route$32
});
var AddCardTokenRoute = Route$22.update({
	id: "/add-card/$token",
	path: "/add-card/$token",
	getParentRoute: () => Route$32
});
var AppIndexRoute = Route$21.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppRoute
});
var AppCalendarRoute = Route$20.update({
	id: "/calendar",
	path: "/calendar",
	getParentRoute: () => AppRoute
});
var AppCardRoute = Route$19.update({
	id: "/card",
	path: "/card",
	getParentRoute: () => AppRoute
});
var AppClientsRoute = Route$18.update({
	id: "/clients",
	path: "/clients",
	getParentRoute: () => AppRoute
});
var AppMessagesRoute = Route$17.update({
	id: "/messages",
	path: "/messages",
	getParentRoute: () => AppRoute
});
var AppNotificationsRoute = Route$16.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => AppRoute
});
var AppPaymentsRoute = Route$15.update({
	id: "/payments",
	path: "/payments",
	getParentRoute: () => AppRoute
});
var AppReceiptsRoute = Route$14.update({
	id: "/receipts",
	path: "/receipts",
	getParentRoute: () => AppRoute
});
var AppSettingsRoute = Route$13.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AppRoute
});
var AppTeamRoute = Route$12.update({
	id: "/team",
	path: "/team",
	getParentRoute: () => AppRoute
});
var AppVisitsRoute = Route$11.update({
	id: "/visits",
	path: "/visits",
	getParentRoute: () => AppRoute
});
var InviteTokenRoute = Route$10.update({
	id: "/invite/$token",
	path: "/invite/$token",
	getParentRoute: () => Route$32
});
var TeamInviteTokenRoute = Route$9.update({
	id: "/team-invite/$token",
	path: "/team-invite/$token",
	getParentRoute: () => Route$32
});
var ApiAuthSplatRoute = Route$8.update({
	id: "/api/auth/$",
	path: "/api/auth/$",
	getParentRoute: () => Route$32
});
var AppClientsIndexRoute = Route$7.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppClientsRoute
});
var AppClientsIdRoute = Route$6.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AppClientsRoute
});
var AppClientsImportRoute = Route$5.update({
	id: "/import",
	path: "/import",
	getParentRoute: () => AppClientsRoute
});
var AppClientsNewRoute = Route$4.update({
	id: "/new",
	path: "/new",
	getParentRoute: () => AppClientsRoute
});
var AppJobsIdRoute = Route$3.update({
	id: "/jobs/$id",
	path: "/jobs/$id",
	getParentRoute: () => AppRoute
});
var AppJobsNewRoute = Route$2.update({
	id: "/jobs/new",
	path: "/jobs/new",
	getParentRoute: () => AppRoute
});
var AppMessagesIndexRoute = Route$1.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppMessagesRoute
});
var AppMessagesClientIdRoute = Route.update({
	id: "/$clientId",
	path: "/$clientId",
	getParentRoute: () => AppMessagesRoute
});
var AppClientsRouteChildren = {
	AppClientsIdRoute,
	AppClientsImportRoute,
	AppClientsNewRoute,
	AppClientsIndexRoute
};
var AppClientsRouteWithChildren = AppClientsRoute._addFileChildren(AppClientsRouteChildren);
var AppMessagesRouteChildren = {
	AppMessagesClientIdRoute,
	AppMessagesIndexRoute
};
var AppRouteChildren = {
	AppCalendarRoute,
	AppCardRoute,
	AppClientsRoute: AppClientsRouteWithChildren,
	AppMessagesRoute: AppMessagesRoute._addFileChildren(AppMessagesRouteChildren),
	AppNotificationsRoute,
	AppPaymentsRoute,
	AppReceiptsRoute,
	AppSettingsRoute,
	AppTeamRoute,
	AppVisitsRoute,
	AppIndexRoute,
	AppJobsIdRoute,
	AppJobsNewRoute
};
var rootRouteChildren = {
	IndexRoute,
	AboutRoute,
	AppRoute: AppRoute._addFileChildren(AppRouteChildren),
	ContactRoute,
	LoginRoute,
	OnboardingRoute,
	PrivacyRoute,
	SignupRoute,
	TermsRoute,
	AddCardTokenRoute,
	InviteTokenRoute,
	TeamInviteTokenRoute,
	ApiAuthSplatRoute
};
var routeTree = Route$32._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { Route$6 as a, Route$13 as c, Route$27 as d, Route$3 as i, Route$20 as l, Route as n, Route$9 as o, Route$2 as r, Route$10 as s, router_exports as t, Route$22 as u };
