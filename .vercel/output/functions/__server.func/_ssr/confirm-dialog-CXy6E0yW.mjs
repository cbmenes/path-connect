import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/confirm-dialog-CXy6E0yW.js
var import_jsx_runtime = require_jsx_runtime();
function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = "Remove", busy, onConfirm }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			title,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: body
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => onOpenChange(false),
					disabled: busy,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "danger",
					disabled: busy,
					onClick: () => void onConfirm(),
					children: busy ? "Removing…" : confirmLabel
				})]
			})]
		})
	});
}
//#endregion
export { ConfirmDialog as t };
