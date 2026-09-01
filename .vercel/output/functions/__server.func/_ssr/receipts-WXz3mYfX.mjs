import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { o as listInvoices } from "./payments-Cs2gLR8L.mjs";
import { f as money, i as formatDate } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { t as InvoiceStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { t as ReceiptBody } from "./receipt-Ad_6ovOu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/receipts-WXz3mYfX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ReceiptsPage() {
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const q = useQuery({
		queryKey: ["invoices"],
		queryFn: () => listInvoices()
	});
	const [open, setOpen] = (0, import_react.useState)(null);
	const rows = q.data ?? [];
	const current = rows.find((r) => r.id === open);
	if (actor.data?.kind === "cleaner") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/app/payments" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Receipts" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: rows.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: i.description
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							formatDate(i.created_at),
							" · ",
							i.receipt_number || "No receipt yet"
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "tabular text-sm",
								children: money(i.amount_cents)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: i.status })]
						}), i.status === "paid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setOpen(i.id),
							children: "View"
						}) : null]
					})]
				}, i.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(current),
				onOpenChange: (o) => !o && setOpen(null),
				children: current ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					title: "Receipt",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptBody, {
						number: current.receipt_number,
						description: current.description,
						amount: current.amount_cents,
						method: current.method,
						paidAt: current.paid_at,
						client: current.client_name
					})
				}) : null
			})
		]
	});
}
//#endregion
export { ReceiptsPage as component };
