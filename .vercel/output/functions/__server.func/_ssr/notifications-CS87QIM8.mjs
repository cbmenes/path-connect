import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as formatDateTime } from "./time-DJsHuhyu.mjs";
import { n as PageHeader, t as EmptyState } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { i as markNotificationsRead, r as listNotifications, t as handleNotification } from "./notifications-2GPgnREj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-CS87QIM8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NotificationsPage() {
	const q = useQuery({
		queryKey: ["notifications"],
		queryFn: () => listNotifications()
	});
	const qc = useQueryClient();
	(0, import_react.useEffect)(() => {
		markNotificationsRead({ data: {} }).then(() => qc.invalidateQueries({ queryKey: ["badges"] })).catch(() => void 0);
	}, [qc]);
	const rows = q.data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Notifications" }), q.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			title: "All quiet",
			body: "Cancel and reschedule requests from clients will show up here."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-2",
			children: rows.map((n) => {
				const open = n.status === "unread" || n.status === "read" && (n.kind === "cancel" || n.kind === "reschedule");
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: cn("grid gap-2 p-4", n.status === "unread" && "ring-2 ring-sage"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs uppercase tracking-[0.14em] text-sage",
									children: n.kind === "cancel" ? "Cancel" : n.kind === "reschedule" ? "Reschedule" : n.kind.replaceAll("_", " ")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: n.title
								}),
								n.client_name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: n.client_name
								}) : null,
								n.requested_start_at ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm",
									children: ["Requested: ", formatDateTime(n.requested_start_at)]
								}) : null,
								n.body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: n.body
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted",
									children: formatDateTime(n.created_at)
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs capitalize text-muted",
								children: n.status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								n.kind === "cancel" || n.kind === "reschedule" ? n.status === "approved" || n.status === "declined" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									onClick: async () => {
										await handleNotification({ data: {
											id: n.id,
											action: "approve"
										} });
										toast.success("Approved.");
										await qc.invalidateQueries({ queryKey: ["notifications"] });
										await qc.invalidateQueries({ queryKey: ["jobs"] });
										await qc.invalidateQueries({ queryKey: ["dashboard"] });
										await qc.invalidateQueries({ queryKey: ["badges"] });
									},
									children: "Approve"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: async () => {
										await handleNotification({ data: {
											id: n.id,
											action: "decline"
										} });
										toast.message("Declined.");
										await qc.invalidateQueries({ queryKey: ["notifications"] });
										await qc.invalidateQueries({ queryKey: ["jobs"] });
										await qc.invalidateQueries({ queryKey: ["dashboard"] });
										await qc.invalidateQueries({ queryKey: ["badges"] });
									},
									children: "Decline"
								})] }) : null,
								n.client_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/app/messages/$clientId",
										params: { clientId: n.client_id },
										children: "Message"
									})
								}) : null,
								n.job_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/app/jobs/$id",
										params: { id: n.job_id },
										children: "Visit"
									})
								}) : null
							]
						}),
						open && (n.kind === "cancel" || n.kind === "reschedule") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-sage",
							children: "Needs a decision."
						}) : null
					]
				}, n.id);
			})
		})]
	});
}
//#endregion
export { NotificationsPage as component };
