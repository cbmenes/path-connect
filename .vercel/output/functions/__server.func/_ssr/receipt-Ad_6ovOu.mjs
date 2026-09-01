import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { f as money, i as formatDate } from "./time-DJsHuhyu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/receipt-Ad_6ovOu.js
var import_jsx_runtime = require_jsx_runtime();
function ReceiptBody({ number, description, amount, method, paidAt, client }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-2 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-2xl text-navy",
				children: money(amount)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: description }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: client
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-muted",
				children: [
					number ? `Receipt ${number}` : "Receipt",
					" · ",
					method || "card",
					paidAt ? ` · ${formatDate(paidAt)}` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: "Test mode — brand and last four only. Full card numbers are never stored."
			})
		]
	});
}
//#endregion
export { ReceiptBody as t };
