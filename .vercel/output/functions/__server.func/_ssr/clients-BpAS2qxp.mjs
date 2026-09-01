import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients-BpAS2qxp.js
var listClients = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("fc209a7a52b666710d32288eda5ab5803c3b59522b71fdc7b5ace90cf5456031"));
var getClient = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("8a7de781936c7ce260f351967584cab362164cbd6d0ba365d2adf3970af95235"));
function cleanClient(input) {
	const name = input.name.trim();
	if (!name) throw new Error("Name is required.");
	return {
		name,
		phone: input.phone?.trim() || null,
		email: input.email?.trim() || null,
		address: input.address?.trim() || null,
		access_notes: input.access_notes?.trim() || null,
		pets: input.pets?.trim() || null,
		supplies: input.supplies?.trim() || null,
		default_price_cents: input.default_price_cents ?? null,
		default_duration_min: input.default_duration_min ?? null,
		usual_day: input.usual_day?.trim() || null,
		usual_time: input.usual_time?.trim() || null,
		frequency: input.frequency?.trim() || null,
		notes: input.notes?.trim() || null
	};
}
var createClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => cleanClient(input)).handler(createSsrRpc("26bdad0338f4d2c830b11e8285c9ae5e0d630e4121e13770eb3dbd5cd2a4d759"));
var updateClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: input.id,
	...cleanClient(input)
})).handler(createSsrRpc("b2e9844f93c8b1edfce6f71f18b776c1b5def9d13bd9390f2fcd3d8155919c38"));
var setClientAssignees = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("215c4bda66dd179d3eb7c608ea5601d588e3828600c345e2aa2e3d2f231f505d"));
var deleteClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("486867218c23bc600baa36164115856817680628530e3715843549dbec01fc17"));
var importClients = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((rows) => rows).handler(createSsrRpc("52aba73f33fe3ee63b5c17647969dc4cd3d1bc8f721156feccce10eaea9630fd"));
//#endregion
export { listClients as a, importClients as i, deleteClient as n, setClientAssignees as o, getClient as r, updateClient as s, createClient as t };
