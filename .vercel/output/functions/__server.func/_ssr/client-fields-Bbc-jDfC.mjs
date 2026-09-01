import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { i as Textarea, n as Input, r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { d as minutesToHours, l as hoursToMinutes } from "./time-DJsHuhyu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-fields-Bbc-jDfC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ClientFields({ initial, onSubmit, submitting, submitLabel }) {
	const [name, setName] = (0, import_react.useState)(initial?.name ?? "");
	const [phone, setPhone] = (0, import_react.useState)(initial?.phone ?? "");
	const [email, setEmail] = (0, import_react.useState)(initial?.email ?? "");
	const [address, setAddress] = (0, import_react.useState)(initial?.address ?? "");
	const [access, setAccess] = (0, import_react.useState)(initial?.access_notes ?? "");
	const [pets, setPets] = (0, import_react.useState)(initial?.pets ?? "");
	const [supplies, setSupplies] = (0, import_react.useState)(initial?.supplies ?? "");
	const [price, setPrice] = (0, import_react.useState)(initial?.default_price_cents != null ? (initial.default_price_cents / 100).toFixed(2) : "");
	const [durationHours, setDurationHours] = (0, import_react.useState)(initial?.default_duration_min != null ? String(minutesToHours(initial.default_duration_min)) : "2");
	const [day, setDay] = (0, import_react.useState)(initial?.usual_day ?? "");
	const [time, setTime] = (0, import_react.useState)(initial?.usual_time ?? "");
	const [frequency, setFrequency] = (0, import_react.useState)(initial?.frequency ?? "weekly");
	const [notes, setNotes] = (0, import_react.useState)(initial?.notes ?? "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit({
				name,
				phone,
				email,
				address,
				access_notes: access,
				pets,
				supplies,
				default_price_cents: price ? Math.round(Number(price) * 100) : null,
				default_duration_min: durationHours ? hoursToMinutes(Number(durationHours)) : null,
				usual_day: day,
				usual_time: time,
				frequency,
				notes
			});
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: name,
					onChange: (e) => setName(e.target.value),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Phone",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: phone,
						onChange: (e) => setPhone(e.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Email",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "email",
						value: email,
						onChange: (e) => setEmail(e.target.value)
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Address",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: address,
					onChange: (e) => setAddress(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Access notes",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: access,
					onChange: (e) => setAccess(e.target.value),
					placeholder: "Key under mat, gate code…"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Pets",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: pets,
						onChange: (e) => setPets(e.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Supplies",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: supplies,
						onChange: (e) => setSupplies(e.target.value)
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Usual price",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						step: "0.01",
						value: price,
						onChange: (e) => setPrice(e.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Duration (hours)",
					hint: "Half-hour steps. Examples: 1, 1.5, 2, 2.5, 3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: .5,
						step: .5,
						value: durationHours,
						onChange: (e) => setDurationHours(e.target.value)
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Usual day",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
							value: day,
							onChange: (e) => setDay(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "—"
							}), [
								"monday",
								"tuesday",
								"wednesday",
								"thursday",
								"friday",
								"saturday",
								"sunday"
							].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: d,
								children: d
							}, d))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Usual time",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "time",
							value: time,
							onChange: (e) => setTime(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Frequency",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
							value: frequency,
							onChange: (e) => setFrequency(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "one-off",
									children: "One-off"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "weekly",
									children: "Weekly"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "biweekly",
									children: "Biweekly"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "monthly",
									children: "Monthly"
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Notes",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: notes,
					onChange: (e) => setNotes(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: submitting,
				children: submitting ? "Saving…" : submitLabel
			})
		]
	});
}
//#endregion
export { ClientFields as t };
