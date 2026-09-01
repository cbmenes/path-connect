import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/payments-Cs2gLR8L.js
var listInvoices = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("2b70ade7ba581deeee7f630de77a4db75df59501bd927ca91970079a25193afa"));
var listCardsForClient = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createSsrRpc("fbcdff9c938774863b97fecb4b65f323b0efb1c3484210d3950c49aad027f013"));
var addCardAuthenticated = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("ae1b17af7c6f9b0e401b84f671af1b45608061da26470bcca9f5c3519adea8fd"));
var addCardByToken = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("00f385d795b67101bb18ee241c8acb548542f6cf33f69ea052262dec9dcb75d2"));
var createCardLink = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createSsrRpc("f06f7c58bcbf29e1a7a3851ee007c622051f3ef850e6981773ddd83c807b6702"));
var setDefaultCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("b14696251ac629cc3ffff9345fd4f0e93a25a744a35914d43c92672977a89d4f"));
var removeCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("a6a18c51a4b1e0ef8df6b5ca5c1274a1ab32c63df5d8b5b85711893a84c80fde"));
var chargeCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input.clientId) throw new Error("Choose a client.");
	if (!input.amountCents || input.amountCents < 50) throw new Error("Amount must be at least $0.50.");
	if (!input.description.trim()) throw new Error("Add a description.");
	return {
		...input,
		description: input.description.trim(),
		kind: input.kind ?? "visit"
	};
}).handler(createSsrRpc("0238a4bf7772f69aa40e56a605241d90a5fc2481d1b0541c25e313db6bbd8ded"));
var recordOutsidePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("26d4f9c5a617a574f4ca139877d447e7d9edba1792cecd6198eb19db7039c49d"));
var payInvoiceAsClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("491eef709878298caa79594c6137ec47235170a4f62e248f494d8e22bc011113"));
var tipJob = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("77e6048c073c2b795d14af108f125a0eccbf0949476acbf03b23576a6a8633ad"));
var requestTip = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((jobId) => jobId).handler(createSsrRpc("bd1b76b461af7c475ce155d47458dd170b93d8e1e46c31d6dc40d01e59c21016"));
createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("9036b0bea769646796121952b4459e588628b7893c4b7a4a64c066b414dcc2e0"));
//#endregion
export { listCardsForClient as a, recordOutsidePayment as c, setDefaultCard as d, tipJob as f, createCardLink as i, removeCard as l, addCardByToken as n, listInvoices as o, chargeCard as r, payInvoiceAsClient as s, addCardAuthenticated as t, requestTip as u };
