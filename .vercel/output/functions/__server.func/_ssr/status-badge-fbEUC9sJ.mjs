import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Badge } from "./card-KluFhvfc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/status-badge-fbEUC9sJ.js
var import_jsx_runtime = require_jsx_runtime();
function JobStatusBadge({ status }) {
	const m = {
		scheduled: {
			tone: "navy",
			label: "Scheduled"
		},
		completed: {
			tone: "sage",
			label: "Completed"
		},
		cancelled: {
			tone: "muted",
			label: "Cancelled"
		},
		reschedule_requested: {
			tone: "warn",
			label: "Reschedule requested"
		}
	}[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		tone: m.tone,
		children: m.label
	});
}
function InvoiceStatusBadge({ status }) {
	const m = {
		unpaid: {
			tone: "warn",
			label: "Unpaid"
		},
		paid: {
			tone: "sage",
			label: "Paid"
		},
		failed: {
			tone: "danger",
			label: "Failed"
		},
		void: {
			tone: "muted",
			label: "Void"
		}
	}[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		tone: m.tone,
		children: m.label
	});
}
function VisitStatusBadge({ job, hideMoney }) {
	if (hideMoney) {
		const status = job.status === "completed" ? "scheduled" : job.status;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobStatusBadge, { status });
	}
	if (job.status === "cancelled" || job.status === "reschedule_requested") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobStatusBadge, { status: job.status });
	if (job.payment_status === "paid") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: "paid" });
	if (job.payment_status === "failed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: "failed" });
	if (job.payment_status === "unpaid") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: "unpaid" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobStatusBadge, { status: "scheduled" });
}
//#endregion
export { VisitStatusBadge as n, InvoiceStatusBadge as t };
