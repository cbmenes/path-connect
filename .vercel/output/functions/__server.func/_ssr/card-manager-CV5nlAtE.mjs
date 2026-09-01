import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { r as brandLabel } from "./card-utils-DAZ5YeNe.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { d as setDefaultCard, l as removeCard, t as addCardAuthenticated } from "./payments-Cs2gLR8L.mjs";
import { r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { t as CardForm } from "./card-form-TJ1umtGi.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { t as ConfirmDialog } from "./confirm-dialog-CXy6E0yW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-manager-CV5nlAtE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function CardSelect({ cards, value, onChange }) {
	if (!cards.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "No card on file yet. Add one first."
	});
	const preferred = cards.find((c) => c.is_default)?.id ?? cards[0]?.id ?? "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
		label: "Charge card",
		hint: "Default is used unless you pick another.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
			value: value || preferred,
			onChange: (e) => onChange(e.target.value),
			children: cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
				value: c.id,
				children: [
					brandLabel(c.brand),
					" · ",
					c.last4,
					c.is_default ? " (default)" : ""
				]
			}, c.id))
		})
	});
}
function CardManager({ clientId, cards, source, onChange }) {
	const [adding, setAdding] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [removeId, setRemoveId] = (0, import_react.useState)(null);
	const removing = cards.find((c) => c.id === removeId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [
			cards.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No card on file yet."
			}) : null,
			cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-medium",
					children: [
						brandLabel(c.brand),
						" · ",
						c.last4
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						c.is_default ? "Default" : c.source === "client" ? "Client card" : "Backup",
						c.exp_month && c.exp_year ? ` · ${c.exp_month}/${c.exp_year}` : "",
						c.failing ? " · Needs update" : ""
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [!c.is_default ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "sm",
						disabled: busy === c.id,
						onClick: async () => {
							setBusy(c.id);
							try {
								await setDefaultCard({ data: {
									cardId: c.id,
									clientId
								} });
								toast.success("Default card updated.");
								await onChange();
							} catch (err) {
								toast.error(err instanceof Error ? err.message : "Could not update.");
							} finally {
								setBusy(null);
							}
						},
						children: "Set as default"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-full bg-sage-soft px-2 py-1 text-xs text-success",
						children: "Preferred"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						disabled: busy === c.id,
						onClick: () => setRemoveId(c.id),
						children: "Remove"
					})]
				})]
			}, c.id)),
			adding ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 font-display text-lg text-navy",
					children: "Add a new card"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardForm, {
					submitLabel: "Save card securely",
					onSubmit: async (payload) => {
						const saved = await addCardAuthenticated({ data: {
							...payload,
							clientId,
							source
						} });
						toast.success(`Saved ${brandLabel(saved.brand)} · ${saved.last4}`);
						setAdding(false);
						await onChange();
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					className: "mt-2",
					onClick: () => setAdding(false),
					children: "Cancel"
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				onClick: () => setAdding(true),
				children: "Replace / add new card"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				open: Boolean(removeId),
				onOpenChange: (o) => !o && setRemoveId(null),
				title: "Remove card?",
				body: `Are you sure you want to remove ${removing ? `${brandLabel(removing.brand)} ••••${removing.last4}` : "this card"}? This cannot be undone.`,
				onConfirm: async () => {
					if (!removing) return;
					setBusy(removing.id);
					try {
						await removeCard({ data: {
							cardId: removing.id,
							clientId
						} });
						toast.message("Card removed.");
						setRemoveId(null);
						await onChange();
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not remove.");
					} finally {
						setBusy(null);
					}
				}
			})
		]
	});
}
//#endregion
export { CardSelect as n, CardManager as t };
