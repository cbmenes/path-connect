import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as Route$3 } from "./router-CXlM22XK.mjs";
import { a as listCardsForClient, r as chargeCard, u as requestTip } from "./payments-Cs2gLR8L.mjs";
import { n as Input, r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { a as formatDateTime, b as toDatetimeLocalValue, f as money, o as formatHours, u as hoursUntil } from "./time-DJsHuhyu.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { n as VisitStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { n as CardSelect } from "./card-manager-CV5nlAtE.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { a as getJob, c as updateJob, s as setJobStatus, t as assignJob } from "./jobs-BanmP-bH.mjs";
import { a as listAssignableStaff } from "./team-B2MC8NJd.mjs";
import { t as AssigneePicker } from "./assignee-picker-7_5jT7tp.mjs";
import { t as JobForm } from "./job-form-DmztECbD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs._id-CjlUu7v0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function JobDetail() {
	const { id } = Route$3.useParams();
	const jobQ = useQuery({
		queryKey: ["job", id],
		queryFn: () => getJob({ data: id })
	});
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [chargeOpen, setChargeOpen] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [assigneeIds, setAssigneeIds] = (0, import_react.useState)(null);
	const [assignScope, setAssignScope] = (0, import_react.useState)("visit");
	const isCleaner = actor.data?.kind === "cleaner";
	const isTeam = actor.data?.kind === "team";
	const canMessage = actor.data?.kind === "cleaner" || actor.data?.kind === "team" && actor.data.canMessage;
	const staff = useQuery({
		queryKey: ["staff"],
		queryFn: () => listAssignableStaff(),
		enabled: isCleaner
	});
	if (jobQ.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-xl bg-secondary" });
	if (jobQ.error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-danger",
		children: jobQ.error.message
	});
	const { job, cancellationPolicy } = jobQ.data;
	const within24 = hoursUntil(job.start_at) < 24 && hoursUntil(job.start_at) > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-2xl gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.16em] text-sage",
					children: job.service
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl text-navy",
					children: job.client_name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-muted",
					children: [
						formatDateTime(job.start_at),
						" · ",
						formatHours(job.duration_min)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, {
						job,
						hideMoney: isTeam
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: job.address
					}),
					isTeam ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular text-lg text-navy",
						children: money(job.price_cents)
					}),
					job.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: job.notes
					}) : null,
					job.recurrence !== "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Repeats ", job.recurrence]
					}) : null,
					job.assignees?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Assigned to ", job.assignees.map((a) => a.full_name).join(", ")]
					}) : job.assignee_name ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Assigned to ", job.assignee_name]
					}) : null
				]
			}),
			isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg text-navy",
						children: "Assigned cleaners"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssigneePicker, {
						staff: staff.data ?? [],
						selected: assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id),
						onChange: setAssigneeIds
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Apply assignment",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
							value: assignScope,
							onChange: (e) => setAssignScope(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "visit",
								children: "Apply to this visit only"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "client_recurring",
								children: "Apply to this client's recurring jobs"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: async () => {
							const ids = assigneeIds ?? (job.assignees ?? []).map((a) => a.user_id);
							await assignJob({ data: {
								id: job.id,
								assignedToUserIds: ids,
								scope: assignScope
							} });
							toast.success(assignScope === "visit" ? "This visit updated." : "Recurring jobs updated.");
							await qc.invalidateQueries({ queryKey: ["job", id] });
							await qc.invalidateQueries({ queryKey: ["jobs"] });
						},
						children: "Save assignees"
					})
				]
			}) : null,
			within24 && cancellationPolicy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl bg-warn/15 p-4 text-sm text-warn",
				children: cancellationPolicy
			}) : null,
			isCleaner || isTeam ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setEditing((v) => !v),
						children: editing ? "Close editor" : "Edit"
					}) : null,
					job.status !== "cancelled" && isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: async () => {
							await setJobStatus({ data: {
								id,
								status: "cancelled",
								reason: "Cancelled by cleaner"
							} });
							toast.message("Visit cancelled.");
							await qc.invalidateQueries({ queryKey: ["job", id] });
							await qc.invalidateQueries({ queryKey: ["jobs"] });
						},
						children: "Cancel visit"
					}) : null,
					job.series_id && isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: async () => {
							await setJobStatus({ data: {
								id,
								status: "cancelled",
								series: true,
								reason: "Series cancelled"
							} });
							toast.message("This and future visits in the series were cancelled.");
							await navigate({ to: "/app/calendar" });
						},
						children: "Cancel series"
					}) : null,
					isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
						open: chargeOpen,
						onOpenChange: setChargeOpen,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Charge card" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChargeDialog, {
							clientId: job.client_id,
							amount: job.price_cents,
							description: `${job.service} — ${job.client_name}`,
							onConfirm: async (amountCents, description, cardId) => {
								setBusy(true);
								try {
									const res = await chargeCard({ data: {
										clientId: job.client_id,
										amountCents,
										description,
										jobId: job.id,
										cardId
									} });
									if (res.ok) {
										toast.success(`Paid. Receipt ${res.receiptNumber}. ${res.brand} · ${res.last4}`);
										setChargeOpen(false);
										await qc.invalidateQueries({ queryKey: ["invoices"] });
										await qc.invalidateQueries({ queryKey: ["job", id] });
										await qc.invalidateQueries({ queryKey: ["dashboard"] });
									} else toast.error(res.reason);
								} catch (err) {
									toast.error(err instanceof Error ? err.message : "Charge failed.");
								} finally {
									setBusy(false);
								}
							},
							busy
						})]
					}) : null,
					isCleaner && (job.payment_status === "paid" || job.status === "completed") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: async () => {
							await requestTip({ data: job.id });
							toast.success("Tip requested.");
						},
						children: "Request a tip"
					}) : null,
					canMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/messages/$clientId",
							params: { clientId: job.client_id },
							children: "Message client"
						})
					}) : null,
					isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/clients/$id",
							params: { id: job.client_id },
							children: "Client profile"
						})
					}) : null
				]
			}) : null,
			editing && isCleaner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobForm, {
				showAssign: true,
				initial: {
					id: job.id,
					clientId: job.client_id,
					service: job.service,
					address: job.address ?? "",
					startLocal: toDatetimeLocalValue(job.start_at),
					durationMin: job.duration_min,
					priceCents: job.price_cents,
					notes: job.notes ?? "",
					recurrence: "none",
					assignedToUserIds: (job.assignees ?? []).map((a) => a.user_id)
				},
				submitLabel: "Save visit",
				onSubmit: async (input) => {
					const res = await updateJob({ data: {
						...input,
						id: job.id
					} });
					toast.success(res.conflictCount ? "Saved with an overlap warning." : "Visit updated.");
					setEditing(false);
					await qc.invalidateQueries({ queryKey: ["job", id] });
				}
			}) : null
		]
	});
}
function ChargeDialog({ clientId, amount, description, onConfirm, busy }) {
	const [amt, setAmt] = (0, import_react.useState)((amount / 100).toFixed(2));
	const [desc, setDesc] = (0, import_react.useState)(description);
	const [cardId, setCardId] = (0, import_react.useState)("");
	const cards = useQuery({
		queryKey: ["cards", clientId],
		queryFn: () => listCardsForClient({ data: clientId })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
		title: "Confirm charge",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Confirm the amount and description before charging the card on file."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Amount",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						step: "0.01",
						min: "0.5",
						value: amt,
						onChange: (e) => setAmt(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Description",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: desc,
						onChange: (e) => setDesc(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardSelect, {
					cards: cards.data ?? [],
					value: cardId,
					onChange: setCardId
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					disabled: busy,
					onClick: () => onConfirm(Math.round(Number(amt) * 100), desc, cardId || void 0),
					children: busy ? "Charging…" : `Charge ${money(Math.round(Number(amt) * 100))}`
				})
			]
		})
	});
}
//#endregion
export { JobDetail as component };
