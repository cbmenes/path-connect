import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
import { r as brandLabel } from "./card-utils-DAZ5YeNe.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { u as Route$22 } from "./router-CXlM22XK.mjs";
import { r as getCardLinkPublic } from "./invites-DRu9LSX0.mjs";
import { n as addCardByToken } from "./payments-Cs2gLR8L.mjs";
import { t as CardForm } from "./card-form-TJ1umtGi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/add-card._token-CXUXxw7b.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AddCardLink() {
	const { token } = Route$22.useParams();
	const link = useQuery({
		queryKey: ["card-link", token],
		queryFn: () => getCardLinkPublic({ data: token })
	});
	const [done, setDone] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-md px-4 py-14",
		children: link.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-danger",
			children: link.error.message
		}) : link.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-[0.18em] text-sage",
				children: "Secure card form"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-2 font-display text-3xl text-navy",
				children: ["Add a card for ", link.data.business_name || link.data.cleaner_name]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					"For ",
					link.data.client_name,
					". SweepBook never keeps the full card number — only the brand and last four."
				]
			}),
			done ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-6 rounded-xl bg-sage-soft p-5 text-success",
				children: [
					"Saved ",
					brandLabel(done.brand),
					" · ",
					done.last4,
					". You can close this page."
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 rounded-xl bg-paper p-5 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardForm, {
					submitting: busy,
					submitLabel: "Save card securely",
					onSubmit: async (payload) => {
						setBusy(true);
						try {
							const saved = await addCardByToken({ data: {
								...payload,
								token,
								source: "client"
							} });
							setDone({
								brand: saved.brand,
								last4: saved.last4
							});
							toast.success("Card saved.");
						} catch (err) {
							toast.error(err instanceof Error ? err.message : "Could not save the card.");
						} finally {
							setBusy(false);
						}
					}
				})
			})
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	}) });
}
//#endregion
export { AddCardLink as component };
