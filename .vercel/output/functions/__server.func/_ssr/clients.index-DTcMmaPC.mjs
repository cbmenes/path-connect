import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as Input } from "./input-DTSEmAWq.mjs";
import { f as money } from "./time-DJsHuhyu.mjs";
import { n as PageHeader, t as EmptyState } from "./empty-state-BsHYEq_p.mjs";
import { a as listClients } from "./clients-BpAS2qxp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients.index-DTcMmaPC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ClientsPage() {
	const q = useQuery({
		queryKey: ["clients"],
		queryFn: () => listClients()
	});
	const [qtext, setQtext] = (0, import_react.useState)("");
	const filtered = (0, import_react.useMemo)(() => {
		const t = qtext.trim().toLowerCase();
		const rows = q.data ?? [];
		if (!t) return rows;
		return rows.filter((c) => [
			c.name,
			c.email,
			c.phone,
			c.address
		].some((v) => (v || "").toLowerCase().includes(t)));
	}, [q.data, qtext]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Clients",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/clients/import",
							children: "Import CSV"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/clients/new",
							children: "Add client"
						})
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Search name, phone, email, address",
				value: qtext,
				onChange: (e) => setQtext(e.target.value)
			}),
			q.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "No clients yet",
				body: "Add a household by hand or import a spreadsheet of the people you already clean for.",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/clients/new",
						children: "Add client"
					})
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/clients/$id",
					params: { id: c.id },
					className: "flex items-center justify-between rounded-xl bg-paper px-4 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: c.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							c.address || "No address",
							" · ",
							c.frequency || "as needed"
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular text-sm text-navy",
						children: c.default_price_cents ? money(c.default_price_cents) : ""
					})]
				}, c.id))
			})
		]
	});
}
//#endregion
export { ClientsPage as component };
