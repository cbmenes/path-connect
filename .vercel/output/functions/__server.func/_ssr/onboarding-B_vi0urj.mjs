import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { n as useCurrentUserState } from "./use-current-user-DG6UNzh9.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
import { n as completeOnboarding } from "./bootstrap-DqRipktd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-B_vi0urj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Onboarding() {
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const [role, setRole] = (0, import_react.useState)("cleaner");
	const [name, setName] = (0, import_react.useState)(user?.displayName ?? "");
	const [business, setBusiness] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-secondary" }) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await completeOnboarding({ data: {
				role,
				fullName: name,
				businessName: business
			} });
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not finish setup.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "mx-auto grid max-w-md gap-4 px-4 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl text-navy",
				children: "How will you use SweepBook?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setRole("cleaner"),
					className: `rounded-xl border p-4 text-left ${role === "cleaner" ? "border-navy bg-paper shadow-card" : "border-border"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "I am the cleaner"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "I schedule visits and invoice my own clients."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setRole("client"),
					className: `rounded-xl border p-4 text-left ${role === "client" ? "border-navy bg-paper shadow-card" : "border-border"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "I am a client"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "I was invited by my cleaner."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Your name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: name,
					onChange: (e) => setName(e.target.value),
					required: true
				})
			}),
			role === "cleaner" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Business name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: business,
					onChange: (e) => setBusiness(e.target.value)
				})
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Continue"
			})
		]
	}) });
}
//#endregion
export { Onboarding as component };
