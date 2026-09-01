import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bootstrap-DqRipktd.js
var bootstrapDemo = createServerFn({ method: "GET" }).handler(createSsrRpc("71c010ecc10192e2540eb3851c3bc1b35fd2880b6edcccf28bcdf47966e98a0c"));
var getMyActor = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("0c5aa3ba80fcc73a7374ab0c37d6c746be0e2938249b9c18b0b37a4031bf8a7c"));
var completeOnboarding = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const fullName = input.fullName.trim();
	if (!fullName) throw new Error("Name is required.");
	if (input.role !== "cleaner" && input.role !== "client") throw new Error("Choose a role.");
	return {
		role: input.role,
		fullName,
		businessName: input.businessName?.trim() || null
	};
}).handler(createSsrRpc("f091207823c1036e7288e32d4485716203db3f9c2daad0f6b807a6ae7912e4f0"));
//#endregion
export { completeOnboarding as n, getMyActor as r, bootstrapDemo as t };
