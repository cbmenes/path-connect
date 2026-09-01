import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/invites-DRu9LSX0.js
var createInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((clientId) => clientId).handler(createSsrRpc("516df6347ee970af03cd6375d0b17f7dc8483e21f0985d201aab52d43e8c48ac"));
var getInvitePublic = createServerFn({ method: "GET" }).validator((token) => token).handler(createSsrRpc("2e703d571691fb3e48e938153a3611902c1910142784d291e2dbeed31ddffc59"));
var acceptInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((token) => token).handler(createSsrRpc("1366dba19ae7c7571e07d9af53b4e344bdaff0662d47b2adb8ae5253e9ea0be4"));
var getCardLinkPublic = createServerFn({ method: "GET" }).validator((token) => token).handler(createSsrRpc("258226a38f7fbe642f5f09775869f3cb6aa84a93d699d9f6f4198f8842a1fa35"));
//#endregion
export { getInvitePublic as i, createInvite as n, getCardLinkPublic as r, acceptInvite as t };
