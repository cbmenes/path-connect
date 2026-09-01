import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/input-DTSEmAWq.js
var import_jsx_runtime = require_jsx_runtime();
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-11 w-full rounded-md border border-border bg-paper px-3 text-base text-ink shadow-soft", "placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40", "disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-24 w-full rounded-md border border-border bg-paper px-3 py-2 text-base text-ink shadow-soft", "placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40", className),
		...props
	});
}
function Field({ label, children, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid gap-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium text-ink",
				children: label
			}),
			children,
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-muted",
				children: hint
			}) : null
		]
	});
}
function NativeSelect({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		className: cn("flex h-11 w-full rounded-md border border-border bg-paper px-3 text-base text-ink shadow-soft", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40", className),
		...props
	});
}
//#endregion
export { Textarea as i, Input as n, NativeSelect as r, Field as t };
