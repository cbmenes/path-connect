import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messages-BnuAbaq7.js
var listThreads = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("73f84e483a243efcd29e7d12213f606f7030a8db906f77fd84996eaa2f4b3421"));
var listMessageRecipients = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("cf91507584cba074aae17550167ebd8c5bffed211a691ab9eb83ee35d64bb52a"));
createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("c5d460359ad5242b0aa81b7565f9f50766e2611300907d762ce49b796e055887"));
var getNavBadges = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("26e59daf5bc37bb6eb89e842a1cba268713447bf0fe2d54ce8d65df058fe67c4"));
var getThread = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createSsrRpc("e3a6600e255c75b129276fc647d1d86f4fdc324d204115266d754271f2867f8e"));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input.body.trim();
	if (!body) throw new Error("Write a message first.");
	return {
		clientId: input.clientId,
		body
	};
}).handler(createSsrRpc("3abf21788e59a584b1efa329b4afb58bc4e123f299d9b278b08bd83d52069f26"));
//#endregion
export { sendMessage as a, listThreads as i, getThread as n, listMessageRecipients as r, getNavBadges as t };
