import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { r as Route$2 } from "./router-CXlM22XK.mjs";
import { h as partsInChicago, r as chicagoDate } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { i as createJob } from "./jobs-BanmP-bH.mjs";
import { t as JobForm } from "./job-form-DmztECbD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs.new-778QgKIF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NewJob() {
	const search = Route$2.useSearch();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-lg grid gap-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "New visit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobForm, {
			showAssign: true,
			initial: {
				startLocal: search.start,
				clientId: search.clientId
			},
			submitting: busy,
			submitLabel: "Add to the book",
			onSubmit: async (input) => {
				setBusy(true);
				try {
					const res = await createJob({ data: input });
					if (res.conflictCount) toast.message(`Saved with ${res.conflictCount} overlap warning${res.conflictCount === 1 ? "" : "s"}.`);
					else toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
					await qc.invalidateQueries({ queryKey: ["jobs"] });
					await qc.invalidateQueries({ queryKey: ["dashboard"] });
					const start = input.startLocal || res.startAt;
					let date;
					if (start) {
						const d = start.includes("T") && !start.endsWith("Z") ? chicagoDate(...start.slice(0, 10).split("-").map(Number), 0, 0) : new Date(start);
						const p = partsInChicago(d);
						date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
					}
					await navigate({
						to: "/app/calendar",
						search: {
							view: "week",
							date
						}
					});
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Could not save.");
				} finally {
					setBusy(false);
				}
			}
		})]
	});
}
//#endregion
export { NewJob as component };
