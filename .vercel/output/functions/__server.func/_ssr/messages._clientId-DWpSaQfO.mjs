import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Route } from "./router-CXlM22XK.mjs";
import { i as Textarea } from "./input-DTSEmAWq.mjs";
import { a as formatDateTime } from "./time-DJsHuhyu.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { a as sendMessage, n as getThread } from "./messages-BnuAbaq7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messages._clientId-DWpSaQfO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ThreadPage() {
	const { clientId } = Route.useParams();
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const q = useQuery({
		queryKey: ["thread", clientId],
		queryFn: () => getThread({ data: clientId })
	});
	const qc = useQueryClient();
	const [body, setBody] = (0, import_react.useState)("");
	const bottom = (0, import_react.useRef)(null);
	const myRole = actor.data?.kind === "client" ? "client" : "cleaner";
	(0, import_react.useEffect)(() => {
		bottom.current?.scrollIntoView({ behavior: "smooth" });
	}, [q.data?.messages.length]);
	(0, import_react.useEffect)(() => {
		if (q.data) {
			qc.invalidateQueries({ queryKey: ["badges"] });
			qc.invalidateQueries({ queryKey: ["threads"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		}
	}, [q.data, qc]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-[70dvh] max-w-2xl flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl text-navy",
				children: q.data?.title || "Messages"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex-1 space-y-2",
				children: [(q.data?.messages ?? []).map((m) => {
					const mine = m.sender_role === myRole;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("flex", mine ? "justify-end" : "justify-start"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", mine ? "bg-navy text-paper" : "bg-paper shadow-soft"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: m.body }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: cn("mt-1 text-[11px]", mine ? "text-paper/60" : "text-muted"),
								children: formatDateTime(m.created_at)
							})]
						})
					}, m.id);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottom })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "sticky bottom-20 mt-4 grid gap-2 bg-bg py-2 md:bottom-0",
				onSubmit: async (e) => {
					e.preventDefault();
					try {
						await sendMessage({ data: {
							clientId,
							body
						} });
						setBody("");
						await qc.invalidateQueries({ queryKey: ["thread", clientId] });
						await qc.invalidateQueries({ queryKey: ["threads"] });
						await qc.invalidateQueries({ queryKey: ["badges"] });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not send.");
					}
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: body,
					onChange: (e) => setBody(e.target.value),
					placeholder: "Write a message",
					rows: 3
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Send"
				})]
			})
		]
	});
}
//#endregion
export { ThreadPage as component };
