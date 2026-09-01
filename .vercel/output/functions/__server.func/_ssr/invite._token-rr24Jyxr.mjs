import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { s as Route$10 } from "./router-CXlM22XK.mjs";
import { i as getInvitePublic, t as acceptInvite } from "./invites-DRu9LSX0.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { t as authClient } from "./client-B40BzJxt.mjs";
import { n as useCurrentUserState } from "./use-current-user-DG6UNzh9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/invite._token-rr24Jyxr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function storeBearer(token) {
	if (!token || typeof window === "undefined") return;
	try {
		sessionStorage.setItem("grok-auth.bearer-token", token);
	} catch {}
}
function InvitePage() {
	const { token } = Route$10.useParams();
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const invite = useQuery({
		queryKey: ["invite", token],
		queryFn: () => getInvitePublic({ data: token })
	});
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (invite.data?.email) setEmail(invite.data.email);
		if (invite.data?.client_name) setName(invite.data.client_name);
	}, [invite.data]);
	async function join() {
		setBusy(true);
		setError(null);
		try {
			await acceptInvite({ data: token });
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not join.");
		} finally {
			setBusy(false);
		}
	}
	async function signup(e) {
		e.preventDefault();
		if (password.length < 8) {
			setError("Use at least 8 characters.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { data, error: err } = await authClient.signUp.email({
				email,
				password,
				name
			});
			if (err) throw new Error(err.message || "Could not create the account.");
			storeBearer(data?.token);
			if (!data?.token) storeBearer((await authClient.signIn.email({
				email,
				password
			})).data?.token);
			await acceptInvite({ data: token });
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not join.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-md px-4 py-14",
		children: invite.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-danger",
			children: invite.error.message
		}) : invite.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-[0.18em] text-sage",
				children: "Client invite"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-2 font-display text-3xl text-navy",
				children: ["Join ", invite.data.business_name || invite.data.cleaner_name]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-muted",
				children: [
					"This portal is for ",
					invite.data.client_name,
					". See visits, message your cleaner, tip, and manage your card."
				]
			}),
			invite.data.accepted_at ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-6 text-sm text-muted",
				children: [
					"This invite was already used.",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "text-navy underline",
						children: "Log in"
					})
				]
			}) : isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-6 h-24 animate-pulse rounded-xl bg-secondary" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-3",
				children: [error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-danger",
					children: error
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					disabled: busy,
					onClick: () => void join(),
					children: busy ? "Joining…" : "Join this portal"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: signup,
				className: "mt-6 grid gap-3 rounded-xl bg-paper p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Your name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: name,
							onChange: (e) => setName(e.target.value),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Password",
						hint: "At least 8 characters.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							minLength: 8
						})
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Creating…" : "Create client account"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-center text-sm text-muted",
						children: [
							"Already have an account?",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								className: "text-navy underline",
								children: "Log in"
							}),
							" ",
							"then return to this link."
						]
					})
				]
			})
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	}) });
}
//#endregion
export { InvitePage as component };
