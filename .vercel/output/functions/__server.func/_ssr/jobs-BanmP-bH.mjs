import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/jobs-BanmP-bH.js
var listJobs = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("fc62151510a0fd5cda4c0871bb7e346047607f2f9037dce5a660696f5e4953b7"));
var getJob = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("af23d6711cefac0c80f5b3a98023d7ae127cbd3ad6514e58f9f94a920a32fc93"));
function parseJobInput(input) {
	if (!input.clientId) throw new Error("Choose a client.");
	if (!input.startLocal) throw new Error("Choose a date and time.");
	const durationMin = Number(input.durationMin);
	const priceCents = Number(input.priceCents);
	if (!durationMin || durationMin < 30) throw new Error("Duration must be at least 0.5 hours.");
	if (priceCents < 0) throw new Error("Price cannot be negative.");
	const recurrence = input.recurrence || "none";
	let assignedToUserIds;
	if (Array.isArray(input.assignedToUserIds)) assignedToUserIds = input.assignedToUserIds.filter(Boolean);
	else if (input.assignedToUserId) assignedToUserIds = [input.assignedToUserId];
	return {
		clientId: input.clientId,
		service: input.service.trim() || "House cleaning",
		address: input.address?.trim() || void 0,
		startLocal: input.startLocal,
		durationMin,
		priceCents,
		notes: input.notes?.trim() || void 0,
		recurrence,
		assignedToUserIds
	};
}
var checkJobConflicts = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("b8e46d292b03e42744b5068c0ea32407139245836d7b20b32bf0f336ee47e115"));
var createJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseJobInput(input)).handler(createSsrRpc("f81d3d33cc6c097f2f7e2fff39638e01337920eae4186ad571f79c4cb8f61f36"));
var updateJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: input.id,
	status: input.status,
	...parseJobInput(input)
})).handler(createSsrRpc("685d610107b2c057d16ef83f6bf21ce54bc9e879fabf75f54129aeb9242e84cb"));
var assignJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("86cdfe150f27971b8434b6e4a8b66718b39f4e0f1e94daaa3254cc704405c338"));
var setJobStatus = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("6937d268f5ece0226f2fa7a651b522cb4e19162af9effee106e4a0520e3adbfc"));
var clientCancelOrReschedule = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("7e554f5030f94b854809dcfbaf9612efe6663cdff71815e852f49feef1fafaee"));
//#endregion
export { getJob as a, updateJob as c, createJob as i, checkJobConflicts as n, listJobs as o, clientCancelOrReschedule as r, setJobStatus as s, assignJob as t };
