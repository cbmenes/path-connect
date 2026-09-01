import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as Wordmark } from "./install-hint-BZppmxWE.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
import { t as GROK_PROVIDERS } from "./server-0DItOaLd.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { n as completeOnboarding } from "./bootstrap-DqRipktd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/signup-BmQSCnR9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function storeBearer(token) {
	if (!token || typeof window === "undefined") return;
	try {
		sessionStorage.setItem("grok-auth.bearer-token", token);
	} catch {}
}
function Signup() {
	const navigate = useNavigate();
	const [name, setName] = (0, import_react.useState)("");
	const [business, setBusiness] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function onSubmit(e) {
		e.preventDefault();
		if (password.length < 8) {
			setError("Use at least 8 characters.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { data, error: err } = await authClient.signUp.email({
				email,
				password,
				name
			});
			if (err) throw new Error(err.message || "Could not create the account.");
			storeBearer(data?.token);
			if (!data?.token) {
				const signed = await authClient.signIn.email({
					email,
					password
				});
				if (signed.error) throw new Error(signed.error.message || "Account created. Please log in.");
				storeBearer(signed.data?.token);
			}
			await completeOnboarding({ data: {
				role: "cleaner",
				fullName: name,
				businessName: business
			} });
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not create the account.");
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
						children: "Start as a cleaner"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "$19/month after you settle in. Clients join from your invite."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "grid gap-3 rounded-xl bg-paper p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Your name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: name,
							onChange: (e) => setName(e.target.value),
							required: true,
							autoComplete: "name"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Business name",
						hint: "Shown to your clients.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: business,
							onChange: (e) => setBusiness(e.target.value),
							placeholder: "Brooks Clean Co."
						})
					}),
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
						hint: "At least 8 characters.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							minLength: 8,
							autoComplete: "new-password"
						})
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Creating…" : "Create account"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					type: "button",
					onClick: () => signIn(p.providerId, { callbackURL: "/onboarding" }),
					children: ["Continue with ", p.label]
				}, p.providerId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-sm text-muted",
				children: [
					"Already have an account?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "text-navy underline-offset-4 hover:underline",
						children: "Log in"
					})
				]
			})
		]
	}) });
}
//#endregion
export { Signup as component };
