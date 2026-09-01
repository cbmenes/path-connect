import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { t as createClient } from "./clients-BpAS2qxp.mjs";
import { t as ClientFields } from "./client-fields-Bbc-jDfC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients.new-Ca34hmKr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NewClient() {
	const navigate = useNavigate();
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-lg gap-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Add client" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientFields, {
			submitting: busy,
			submitLabel: "Save client",
			onSubmit: async (input) => {
				setBusy(true);
				try {
					const res = await createClient({ data: input });
					toast.success("Client added.");
					await navigate({
						to: "/app/clients/$id",
						params: { id: res.id }
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
export { NewClient as component };
