import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as Textarea, n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { a as formatDateTime, f as money, o as formatHours, u as hoursUntil } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { n as VisitStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { r as isClientDash, t as getDashboard } from "./dashboard-BnZLOo9R.mjs";
import { a as getJob, r as clientCancelOrReschedule } from "./jobs-BanmP-bH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/visits-CyMLe27I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function VisitsPage() {
	const q = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => getDashboard()
	});
	const qc = useQueryClient();
	const upcoming = q.data && isClientDash(q.data) ? q.data.upcoming : [];
	const past = q.data && isClientDash(q.data) ? q.data.past : [];
	const [active, setActive] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)("");
	const [requestedStart, setRequestedStart] = (0, import_react.useState)("");
	const jobMeta = useQuery({
		queryKey: ["job", active?.id],
		queryFn: () => getJob({ data: active.id }),
		enabled: Boolean(active?.id)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Your visits" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Upcoming"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: upcoming.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Nothing scheduled."
				}) : upcoming.map((j) => {
					const soon = hoursUntil(j.start_at) < 24;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium",
										children: formatDateTime(j.start_at)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-muted",
										children: [
											formatHours(j.duration_min),
											" · ",
											money(j.price_cents)
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: j.address
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, { job: j })]
							}),
							soon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-warn",
								children: "Inside 24 hours — the cancellation policy applies."
							}) : null,
							j.status === "scheduled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => {
										setActive({
											id: j.id,
											action: "reschedule"
										});
										setNote("");
										setRequestedStart("");
									},
									children: "Request reschedule"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										setActive({
											id: j.id,
											action: "cancel"
										});
										setNote("");
									},
									children: "Cancel"
								})]
							}) : null
						]
					}, j.id);
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Past"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: past.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: formatDateTime(j.start_at)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: money(j.price_cents)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, { job: j })]
				}, j.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(active),
				onOpenChange: (o) => !o && setActive(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					title: active?.action === "cancel" ? "Cancel this visit?" : "Request a new time",
					children: [
						jobMeta.data?.cancellationPolicy && hoursUntil(jobMeta.data.job.start_at) < 24 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-3 rounded-md bg-warn/15 p-3 text-sm text-warn",
							children: jobMeta.data.cancellationPolicy
						}) : null,
						active?.action === "reschedule" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Requested new time",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "datetime-local",
								value: requestedStart,
								onChange: (e) => setRequestedStart(e.target.value)
							})
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Note for your cleaner",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: note,
								onChange: (e) => setNote(e.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-3",
							onClick: async () => {
								if (!active) return;
								const res = await clientCancelOrReschedule({ data: {
									id: active.id,
									action: active.action,
									note,
									requestedStart: requestedStart || void 0
								} });
								toast.success(active.action === "cancel" ? "Visit cancelled. Your cleaner was notified." : "Reschedule requested. Your cleaner was notified.");
								if (res.within24) toast.message("This visit was inside 24 hours.");
								setActive(null);
								await qc.invalidateQueries({ queryKey: ["dashboard"] });
								await qc.invalidateQueries({ queryKey: ["jobs"] });
							},
							children: "Confirm"
						})
					]
				})
			})
		]
	});
}
//#endregion
export { VisitsPage as component };
