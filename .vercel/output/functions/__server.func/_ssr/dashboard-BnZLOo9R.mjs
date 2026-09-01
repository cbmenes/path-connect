import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-BnZLOo9R.js
function isCleanerDash(d) {
	return d.actor.kind === "cleaner";
}
function isTeamDash(d) {
	return d.actor.kind === "team";
}
function isClientDash(d) {
	return d.actor.kind === "client";
}
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("5d238c6b56915ee2e83d3ef706b2badf9149e9d22d9ec36ab5a38c425524cdbd"));
var updateSettings = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("52376275f87fd45176ab7c016893d22d7f4c98439eb58544a3428116c4e9ec7b"));
//#endregion
export { updateSettings as a, isTeamDash as i, isCleanerDash as n, isClientDash as r, getDashboard as t };
