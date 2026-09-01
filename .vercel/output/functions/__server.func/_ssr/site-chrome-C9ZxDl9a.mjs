import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { d as Menu, t as X } from "../_libs/lucide-react.mjs";
import { n as Wordmark, t as InstallHint } from "./install-hint-BZppmxWE.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-chrome-C9ZxDl9a.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SiteChrome({ children }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-16 max-w-6xl items-center justify-between px-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
							className: "hidden items-center gap-6 text-sm text-muted md:flex",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/#scheduling",
									className: "hover:text-ink",
									children: "Scheduling"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/#payments",
									className: "hover:text-ink",
									children: "Payments"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/#portal",
									className: "hover:text-ink",
									children: "Client portal"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/#pricing",
									className: "hover:text-ink",
									children: "Pricing"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden items-center gap-2 md:flex",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/login",
									children: "Log in"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/signup",
									children: "Get started"
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "grid size-11 place-items-center rounded-md md:hidden",
							onClick: () => setOpen((v) => !v),
							"aria-label": "Menu",
							children: open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
						})
					]
				}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-1 border-t border-border px-4 py-3 md:hidden",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "flex min-h-11 items-center",
							href: "/#scheduling",
							onClick: () => setOpen(false),
							children: "Scheduling"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "flex min-h-11 items-center",
							href: "/#payments",
							onClick: () => setOpen(false),
							children: "Payments"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "flex min-h-11 items-center",
							href: "/#portal",
							onClick: () => setOpen(false),
							children: "Client portal"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "flex min-h-11 items-center",
							href: "/#pricing",
							onClick: () => setOpen(false),
							children: "Pricing"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								children: "Log in"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/signup",
								children: "Get started"
							})
						})
					]
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { children }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "border-t border-border bg-navy text-paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { light: true }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-sm text-sm text-paper/70",
							children: "Scheduling, records, messaging, and payments for independent house cleaners. Your clients. Not a marketplace."
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium text-paper",
									children: "Product"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/login",
									className: "text-paper/70 hover:text-paper",
									children: "Log in"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/signup",
									className: "text-paper/70 hover:text-paper",
									children: "Get started"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/#pricing",
									className: "text-paper/70 hover:text-paper",
									children: "Pricing"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium text-paper",
									children: "Company"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/about",
									className: "text-paper/70 hover:text-paper",
									children: "About"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/privacy",
									className: "text-paper/70 hover:text-paper",
									children: "Privacy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/terms",
									className: "text-paper/70 hover:text-paper",
									children: "Terms"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/contact",
									className: "text-paper/70 hover:text-paper",
									children: "Contact"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "border-t border-paper/10 px-4 py-4 text-center text-xs text-paper/50",
					children: [
						"© ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" SweepBook. Built for independent cleaners."
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InstallHint, {})
		]
	});
}
//#endregion
export { SiteChrome as t };
