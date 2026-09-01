import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { o as Share, t as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/install-hint-BZppmxWE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Wordmark({ to = "/", className, light = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: to,
		className: cn("flex items-center gap-2", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("grid size-8 place-items-center rounded-md", light ? "bg-paper/15 text-paper" : "bg-navy text-paper"),
			"aria-hidden": true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				className: "size-4",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 18c4-1 6-7 14-9" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 8.5h9.5a3 3 0 0 1 0 6H9" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 8.5v6" })
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("font-display text-lg tracking-tight", light ? "text-paper" : "text-navy"),
			children: "SweepBook"
		})]
	});
}
function InstallHint() {
	const [show, setShow] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const narrow = window.matchMedia("(max-width: 720px)").matches;
		const standalone = window.matchMedia("(display-mode: standalone)").matches;
		const dismissed = localStorage.getItem("sweepbook-install-dismissed");
		if (narrow && !standalone && !dismissed) setShow(true);
	}, []);
	if (!show) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-x-3 bottom-[4.75rem] z-40 rounded-lg border border-border bg-paper p-3 shadow-card md:bottom-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid size-9 shrink-0 place-items-center rounded-md bg-sage-soft text-navy",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium text-ink",
						children: "Install SweepBook"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "On iPhone, tap Share, then Add to Home Screen. On Android, use the browser menu and Install app."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "grid size-11 shrink-0 place-items-center rounded-md text-muted hover:bg-secondary",
					onClick: () => {
						localStorage.setItem("sweepbook-install-dismissed", "1");
						setShow(false);
					},
					"aria-label": "Dismiss",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})
			]
		})
	});
}
//#endregion
export { Wordmark as n, InstallHint as t };
