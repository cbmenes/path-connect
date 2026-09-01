import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { a as listCardsForClient } from "./payments-Cs2gLR8L.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { t as CardManager } from "./card-manager-CV5nlAtE.mjs";
import { t as getDashboard } from "./dashboard-BnZLOo9R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-B5C46y9O.js
var import_jsx_runtime = require_jsx_runtime();
function CardPage() {
	const dash = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => getDashboard()
	});
	const clientId = dash.data?.actor.kind === "client" ? dash.data.actor.client.id : "";
	const cards = useQuery({
		queryKey: ["cards", clientId],
		queryFn: () => listCardsForClient({ data: clientId }),
		enabled: Boolean(clientId)
	});
	const qc = useQueryClient();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-lg gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Your card" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "The default card is used for visits and tips unless you pick another at checkout. We never store the full number — only brand and last four."
			}),
			clientId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardManager, {
				clientId,
				cards: cards.data ?? [],
				source: "client",
				onChange: async () => {
					await qc.invalidateQueries({ queryKey: ["cards"] });
					await qc.invalidateQueries({ queryKey: ["dashboard"] });
				}
			}) : null
		]
	});
}
//#endregion
export { CardPage as component };
