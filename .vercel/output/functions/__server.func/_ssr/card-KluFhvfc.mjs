import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-KluFhvfc.js
var import_jsx_runtime = require_jsx_runtime();
function Card({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-xl bg-paper p-5 text-ink shadow-card", className),
		...props
	});
}
function Badge({ className, tone = "navy", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
			navy: "bg-navy/10 text-navy",
			sage: "bg-sage-soft text-success",
			warn: "bg-warn/15 text-warn",
			danger: "bg-danger/10 text-danger",
			muted: "bg-secondary text-muted"
		}[tone], className),
		...props
	});
}
//#endregion
export { Card as n, Badge as t };
