import { i as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-B2MC8NJd.js
var listTeam = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("294d13ca06b61665fea7bb95af227f7279a33b68c9b360f0d6d575caa7c26aa2"));
var listAssignableStaff = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("20cb9200317ac161a7c445bb0578980ac0259ac0fde9a2f3647ac8ebef0f010b"));
var createTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const name = input.name.trim();
	if (!name) throw new Error("Name is required.");
	return {
		name,
		phone: input.phone?.trim() || null,
		email: input.email?.trim() || null,
		canMessage: input.canMessage !== false
	};
}).handler(createSsrRpc("78dbb185bc52a8a04d63c452731c6d0a1486ab66648ac2d6e3afc9234a5756a5"));
var getTeamInvitePublic = createServerFn({ method: "GET" }).validator((token) => token).handler(createSsrRpc("a4ac1f54a72e97185c4b500f68491d19e268ab6a5f76cf6a5fa09e5a29b9b0a7"));
var acceptTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((token) => token).handler(createSsrRpc("439d10020b556785713a03b95295287d839175f23c409c50fcae37f7c65461e6"));
var updateTeamMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("2188f7aa9bc71672720e1e3b50778ff7efe85f0f80584e75b778b3f32af30cd9"));
var resendTeamInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("37a3f7652d465240b0f05612cc4bdbdc90836632a10142d9a441bc5ec2e9bce3"));
var deleteTeamMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("f97ced425749bf09d9e806164edaafdc110325bb152cc56e1a4a5671871ae04a"));
var setTeamMessaging = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((enabled) => enabled).handler(createSsrRpc("e1b8422f83c82a8f8f0fa3114a7a3aec4a3f9d8363b8e5eff90949347d2bf5ca"));
//#endregion
export { listAssignableStaff as a, setTeamMessaging as c, getTeamInvitePublic as i, updateTeamMember as l, createTeamInvite as n, listTeam as o, deleteTeamMember as r, resendTeamInvite as s, acceptTeamInvite as t };
