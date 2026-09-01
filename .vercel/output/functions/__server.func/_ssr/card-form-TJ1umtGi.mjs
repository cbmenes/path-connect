import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { a as formatCardNumber, n as TEST_SUCCESS, o as luhnOk, t as TEST_DECLINE } from "./card-utils-DAZ5YeNe.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-form-TJ1umtGi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function CardForm({ onSubmit, submitting, submitLabel = "Save card" }) {
	const [number, setNumber] = (0, import_react.useState)("");
	const [expiry, setExpiry] = (0, import_react.useState)("");
	const [cvc, setCvc] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	async function handleSubmit(e) {
		e.preventDefault();
		const digits = number.replace(/\D/g, "");
		if (!luhnOk(digits)) {
			setError("Check the card number.");
			return;
		}
		const [mm, yy] = expiry.split("/");
		const expMonth = Number(mm);
		const expYear = Number(yy?.length === 2 ? `20${yy}` : yy);
		if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
			setError("Use a valid expiry (MM/YY).");
			return;
		}
		if (cvc.replace(/\D/g, "").length < 3) {
			setError("Enter the CVC.");
			return;
		}
		setError(null);
		await onSubmit({
			number: digits,
			expMonth,
			expYear,
			cvc: cvc.replace(/\D/g, ""),
			holderName: name.trim()
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "grid gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-md bg-navy px-3 py-2 text-xs text-primary-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium tracking-wide",
					children: "TEST MODE"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "opacity-80",
					children: "No live charges. Cards are never stored in full."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Cardholder name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: name,
					onChange: (e) => setName(e.target.value),
					autoComplete: "cc-name",
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Card number",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					inputMode: "numeric",
					autoComplete: "cc-number",
					placeholder: "ACCT-000015",
					value: number,
					onChange: (e) => setNumber(formatCardNumber(e.target.value)),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Expiry",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						inputMode: "numeric",
						autoComplete: "cc-exp",
						placeholder: "MM/YY",
						value: expiry,
						onChange: (e) => {
							const v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
							setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
						},
						required: true
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "CVC",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						inputMode: "numeric",
						autoComplete: "cc-csc",
						placeholder: "123",
						value: cvc,
						onChange: (e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4)),
						required: true
					})
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted",
				children: [
					"Try ",
					formatCardNumber(TEST_SUCCESS),
					" to succeed, or ",
					formatCardNumber(TEST_DECLINE),
					" to simulate a decline. Only brand and last four are saved."
				]
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
export { CardForm as t };
