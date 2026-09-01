import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { i as Textarea, n as Input, r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { b as toDatetimeLocalValue, d as minutesToHours, f as money, l as hoursToMinutes } from "./time-DJsHuhyu.mjs";
import { n as checkJobConflicts } from "./jobs-BanmP-bH.mjs";
import { a as listAssignableStaff } from "./team-B2MC8NJd.mjs";
import { t as AssigneePicker } from "./assignee-picker-7_5jT7tp.mjs";
import { a as listClients } from "./clients-BpAS2qxp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/job-form-DmztECbD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function JobForm({ initial, onSubmit, submitting, submitLabel, showAssign }) {
	const [clients, setClients] = (0, import_react.useState)([]);
	const [staff, setStaff] = (0, import_react.useState)([]);
	const [clientId, setClientId] = (0, import_react.useState)(initial?.clientId ?? "");
	const [service, setService] = (0, import_react.useState)(initial?.service ?? "House cleaning");
	const [address, setAddress] = (0, import_react.useState)(initial?.address ?? "");
	const [startLocal, setStartLocal] = (0, import_react.useState)(initial?.startLocal ?? toDatetimeLocalValue(/* @__PURE__ */ new Date()));
	const [durationHours, setDurationHours] = (0, import_react.useState)(String(minutesToHours(initial?.durationMin ?? 120) || 2));
	const [priceCents, setPriceCents] = (0, import_react.useState)(initial?.priceCents ?? 15e3);
	const [notes, setNotes] = (0, import_react.useState)(initial?.notes ?? "");
	const [recurrence, setRecurrence] = (0, import_react.useState)(initial?.recurrence ?? "none");
	const [assignedToUserIds, setAssignedToUserIds] = (0, import_react.useState)(initial?.assignedToUserIds ?? (initial?.assignedToUserId ? [initial.assignedToUserId] : []));
	const [conflicts, setConflicts] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		listClients().then(setClients).catch(() => setClients([]));
		if (showAssign) listAssignableStaff().then(setStaff).catch(() => setStaff([]));
	}, [showAssign]);
	(0, import_react.useEffect)(() => {
		if (!clientId || assignedToUserIds.length) return;
		const c = clients.find((x) => x.id === clientId);
		if (c?.assigned_user_ids?.length) setAssignedToUserIds(c.assigned_user_ids);
	}, [
		clients,
		clientId,
		assignedToUserIds.length
	]);
	const durationMin = hoursToMinutes(Number(durationHours) || 0);
	(0, import_react.useEffect)(() => {
		const t = setTimeout(() => {
			checkJobConflicts({ data: {
				startLocal,
				durationMin,
				ignoreId: initial?.id,
				assignedToUserIds
			} }).then((r) => setConflicts(r.conflicts.length)).catch(() => setConflicts(0));
		}, 250);
		return () => clearTimeout(t);
	}, [
		startLocal,
		durationMin,
		initial?.id,
		assignedToUserIds
	]);
	function onClient(id) {
		setClientId(id);
		const c = clients.find((x) => x.id === id);
		if (c) {
			if (c.address) setAddress(c.address);
			if (c.default_duration_min) setDurationHours(String(minutesToHours(c.default_duration_min)));
			if (c.default_price_cents) setPriceCents(c.default_price_cents);
			if (c.assigned_user_ids) setAssignedToUserIds(c.assigned_user_ids);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit({
				clientId,
				service,
				address,
				startLocal,
				durationMin,
				priceCents: Number(priceCents),
				notes,
				recurrence,
				assignedToUserIds
			});
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Client",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
					value: clientId,
					onChange: (e) => onClient(e.target.value),
					required: true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Select a client"
					}), clients.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: c.id,
						children: c.name
					}, c.id))]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Service",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: service,
					onChange: (e) => setService(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Address",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: address,
					onChange: (e) => setAddress(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Date and time",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "datetime-local",
					value: startLocal,
					onChange: (e) => setStartLocal(e.target.value),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Duration (hours)",
					hint: "Half-hour steps. Examples: 1, 1.5, 2, 2.5, 3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: .5,
						step: .5,
						value: durationHours,
						onChange: (e) => setDurationHours(e.target.value),
						required: true
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Price",
					hint: money(Number(priceCents) || 0),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: 0,
						step: "0.01",
						value: (Number(priceCents) / 100).toFixed(2),
						onChange: (e) => setPriceCents(Math.round(Number(e.target.value) * 100))
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Repeat",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
					value: recurrence,
					onChange: (e) => setRecurrence(e.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "none",
							children: "One-off"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "weekly",
							children: "Weekly"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "biweekly",
							children: "Every other week"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "monthly",
							children: "Monthly"
						})
					]
				})
			}),
			showAssign ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium text-ink",
						children: "Assigned cleaners"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "New recurring visits inherit the client’s team unless you change them here."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssigneePicker, {
						staff,
						selected: assignedToUserIds,
						onChange: setAssignedToUserIds
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Notes",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: notes,
					onChange: (e) => setNotes(e.target.value)
				})
			}),
			conflicts > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-md bg-warn/15 px-3 py-2 text-sm text-warn",
				children: [
					"This overlaps ",
					conflicts,
					" other visit",
					conflicts === 1 ? "" : "s",
					" on your book. You can still save it."
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: submitting,
				children: submitting ? "Saving…" : submitLabel
			})
		]
	});
}
//#endregion
export { JobForm as t };
