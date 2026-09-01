import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link, y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as recordOutsidePayment, o as listInvoices } from "./payments-Cs2gLR8L.mjs";
import { r as NativeSelect } from "./input-DTSEmAWq.mjs";
import { f as money, i as formatDate } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { t as InvoiceStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { t as ReceiptBody } from "./receipt-Ad_6ovOu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/payments-cfZ37ZnP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PaymentsPage() {
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const q = useQuery({
		queryKey: ["invoices"],
		queryFn: () => listInvoices()
	});
	const qc = useQueryClient();
	const [filter, setFilter] = (0, import_react.useState)("all");
	const rows = q.data ?? [];
	const [receiptId, setReceiptId] = (0, import_react.useState)(null);
	const receipt = rows.find((r) => r.id === receiptId) ?? null;
	const filtered = (0, import_react.useMemo)(() => filter === "all" ? rows : rows.filter((r) => r.status === filter), [rows, filter]);
	if (actor.data?.kind === "client") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/app/receipts" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Payments" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
					className: "max-w-48",
					value: filter,
					onChange: (e) => setFilter(e.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "all",
							children: "All"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "unpaid",
							children: "Unpaid"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "paid",
							children: "Paid"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "failed",
							children: "Failed"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: ["Outstanding ", money(rows.filter((r) => r.status === "unpaid" || r.status === "failed").reduce((n, r) => n + r.amount_cents, 0))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: filtered.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-wrap items-center justify-between gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: i.client_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							i.description,
							" · ",
							formatDate(i.created_at)
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular",
									children: money(i.amount_cents)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: i.status })]
							}),
							i.status === "paid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setReceiptId(i.id),
								children: "Receipt"
							}) : null,
							i.status !== "paid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: async () => {
									const res = await recordOutsidePayment({ data: {
										invoiceId: i.id,
										clientId: i.client_id,
										amountCents: i.amount_cents,
										description: i.description,
										method: "outside"
									} });
									toast.success(`Marked paid. Receipt ${res.receiptNumber}`);
									await qc.invalidateQueries({ queryKey: ["invoices"] });
								},
								children: "Mark paid outside"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/app/clients/$id",
									params: { id: i.client_id },
									children: "Client"
								})
							})
						]
					})]
				}, i.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(receipt),
				onOpenChange: (o) => !o && setReceiptId(null),
				children: receipt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					title: "Receipt",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptBody, {
						number: receipt.receipt_number,
						description: receipt.description,
						amount: receipt.amount_cents,
						method: receipt.method,
						paidAt: receipt.paid_at,
						client: receipt.client_name
					})
				}) : null
			})
		]
	});
}
//#endregion
export { PaymentsPage as component };
