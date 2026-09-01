import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as Input } from "./input-DTSEmAWq.mjs";
import { a as formatDateTime } from "./time-DJsHuhyu.mjs";
import { n as PageHeader, t as EmptyState } from "./empty-state-BsHYEq_p.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { i as listThreads, r as listMessageRecipients } from "./messages-BnuAbaq7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messages.index-DnUlBqyc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MessagesPage() {
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const q = useQuery({
		queryKey: ["threads"],
		queryFn: () => listThreads()
	});
	const threads = q.data ?? [];
	const [compose, setCompose] = (0, import_react.useState)(false);
	const isClient = actor.data?.kind === "client";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Messages",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setCompose(true),
					children: "New message"
				})
			}),
			q.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" }) : threads.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "No threads yet",
				body: isClient ? "Send a note to your cleaner." : "Start a conversation from New message."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: threads.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/messages/$clientId",
					params: { clientId: t.client_id },
					className: "rounded-xl bg-paper px-4 py-3 shadow-soft",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: t.client_name
							}), t.unread ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-navy px-2 text-xs text-paper",
								children: t.unread
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-muted",
							children: t.last_body
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: t.last_at ? formatDateTime(t.last_at) : ""
						})
					]
				}, t.client_id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewMessageDialog, {
				open: compose,
				onOpenChange: setCompose
			})
		]
	});
}
function NewMessageDialog({ open, onOpenChange }) {
	const navigate = useNavigate();
	const people = useQuery({
		queryKey: ["message-recipients"],
		queryFn: () => listMessageRecipients(),
		enabled: open
	});
	const [qtext, setQtext] = (0, import_react.useState)("");
	const filtered = (0, import_react.useMemo)(() => {
		const t = qtext.trim().toLowerCase();
		const rows = people.data ?? [];
		if (!t) return rows;
		return rows.filter((p) => [p.name, p.subtitle].some((v) => (v || "").toLowerCase().includes(t)));
	}, [people.data, qtext]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => {
			onOpenChange(o);
			if (!o) setQtext("");
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			title: "New message",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				autoFocus: true,
				placeholder: "Type a name to filter",
				value: qtext,
				onChange: (e) => setQtext(e.target.value)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid max-h-80 gap-1 overflow-y-auto",
				children: people.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 animate-pulse rounded-lg bg-secondary" }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 py-3 text-sm text-muted",
					children: "No matches."
				}) : filtered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "rounded-lg px-3 py-3 text-left hover:bg-secondary",
					onClick: () => {
						onOpenChange(false);
						navigate({
							to: "/app/messages/$clientId",
							params: { clientId: p.id }
						});
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: p.name
					}), p.subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: p.subtitle
					}) : null]
				}, p.id))
			})]
		})
	});
}
//#endregion
export { MessagesPage as component };
