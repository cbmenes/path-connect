import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as Wordmark } from "./install-hint-BZppmxWE.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
import { t as GROK_PROVIDERS } from "./server-0DItOaLd.mjs";
import { d as Route$27 } from "./router-CXlM22XK.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { t as bootstrapDemo } from "./bootstrap-DqRipktd.mjs";
import { a as DEMO_CLIENT_EMAIL, d as DEMO_TEAM_EMAIL, i as DEMO_CLEANER_PASSWORD, n as DEMO_CLEANER_EMAIL, o as DEMO_CLIENT_PASSWORD, p as DEMO_TEAM_PASSWORD } from "./types-B_qDZzxc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-8PeKbY6D.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function storeBearer(token) {
	if (!token || typeof window === "undefined") return;
	try {
		sessionStorage.setItem("grok-auth.bearer-token", token);
	} catch {}
}
async function emailSignIn(email, password) {
	const { data, error } = await authClient.signIn.email({
		email,
		password
	});
	if (error) throw new Error(error.message || "Could not sign in.");
	storeBearer(data?.token);
	return data;
}
function Login() {
	const { demo } = Route$27.useSearch();
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)(demo === "client" ? DEMO_CLIENT_EMAIL : demo === "team" ? DEMO_TEAM_EMAIL : demo === "cleaner" ? DEMO_CLEANER_EMAIL : "");
	const [password, setPassword] = (0, import_react.useState)(demo === "client" ? DEMO_CLIENT_PASSWORD : demo === "team" ? DEMO_TEAM_PASSWORD : demo === "cleaner" ? DEMO_CLEANER_PASSWORD : "");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		bootstrapDemo();
	}, []);
	async function onSubmit(e) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await emailSignIn(email, password);
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not sign in.");
		} finally {
			setBusy(false);
		}
	}
	async function useDemo(kind) {
		setBusy(true);
		setError(null);
		try {
			await bootstrapDemo();
			if (kind === "cleaner") await emailSignIn(DEMO_CLEANER_EMAIL, DEMO_CLEANER_PASSWORD);
			else if (kind === "team") await emailSignIn(DEMO_TEAM_EMAIL, DEMO_TEAM_PASSWORD);
			else await emailSignIn(DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD);
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Demo sign-in failed.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-md gap-6 px-4 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { className: "justify-center" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-6 font-display text-3xl text-navy",
						children: "Welcome back"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Cleaners and clients use the same website."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "grid gap-3 rounded-xl bg-paper p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							required: true,
							autoComplete: "email"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Password",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							autoComplete: "current-password"
						})
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Signing in…" : "Log in"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						disabled: busy,
						onClick: () => void useDemo("cleaner"),
						children: "Open cleaner demo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						disabled: busy,
						onClick: () => void useDemo("team"),
						children: "Open team demo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						disabled: busy,
						onClick: () => void useDemo("client"),
						children: "Open client demo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-center text-xs text-muted",
						children: [
							"Owner ",
							DEMO_CLEANER_EMAIL,
							" / ",
							DEMO_CLEANER_PASSWORD,
							" · Team ",
							DEMO_TEAM_EMAIL,
							" / ",
							DEMO_TEAM_PASSWORD,
							" · Client",
							" ",
							DEMO_CLIENT_EMAIL,
							" / ",
							DEMO_CLIENT_PASSWORD
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					type: "button",
					onClick: () => signIn(p.providerId, { callbackURL: "/app" }),
					children: ["Continue with ", p.label]
				}, p.providerId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-sm text-muted",
				children: [
					"New cleaner?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/signup",
						className: "text-navy underline-offset-4 hover:underline",
						children: "Create an account"
					})
				]
			})
		]
	}) });
}
//#endregion
export { Login as component, emailSignIn };
