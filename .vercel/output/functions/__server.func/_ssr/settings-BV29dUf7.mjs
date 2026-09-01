import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as brandLabel } from "./card-utils-DAZ5YeNe.mjs";
import { i as createServerFn } from "./ssr.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as Route$13 } from "./router-CXlM22XK.mjs";
import { t as authMiddleware } from "./middleware-D9dxL1xu.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
import { a as listCardsForClient } from "./payments-Cs2gLR8L.mjs";
import { i as Textarea, n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { t as CardForm } from "./card-form-TJ1umtGi.mjs";
import { f as money } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { t as ConfirmDialog } from "./confirm-dialog-CXy6E0yW.mjs";
import { t as CardManager } from "./card-manager-CV5nlAtE.mjs";
import { a as updateSettings } from "./dashboard-BnZLOo9R.mjs";
import { t as authClient } from "./client-B40BzJxt.mjs";
import { t as useCurrentUser } from "./use-current-user-DG6UNzh9.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-BV29dUf7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var listBillingMethods = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("f70560128e12b6ac5617d7ddc5f7d9b5d7fb4d8a9a281255ef55a721bcbb4a1c"));
var addBillingCard = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("281df703822e9ee31606ed5cd4e355a2b35ac014e3ec398dac6c7e8af57dc100"));
var addBillingAch = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("31d802ea317f1d46efb704ce816601afa8c1fb2cdc0653c55765b16cf75c1a65"));
var setDefaultBillingMethod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("a9ed382a5a9057d4a131137b0586f40440842b3fd006a2006f8da53b3edcb6e1"));
var removeBillingMethod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("a54bfb6b4ea534126dcfd1a5cfba7267e5b1132570ac005f72b5d5cecb9167e5"));
var updateAccount = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const email = input.email.trim().toLowerCase();
	if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
	return { email };
}).handler(createSsrRpc("94087c886f051e18fe824cb55e7aabd7a2103b727f2259527a386d4b168b6d3b"));
function SettingsPage() {
	const { tab = "profile" } = Route$13.useSearch();
	const q = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const kind = q.data?.kind;
	const tabs = kind === "cleaner" ? [
		"profile",
		"account",
		"billing"
	] : kind === "client" ? [
		"profile",
		"account",
		"billing"
	] : ["profile", "account"];
	const active = tabs.includes(tab) ? tab : "profile";
	function tabLabel(t) {
		if (t === "profile") return kind === "cleaner" ? "Profile" : "Contact";
		if (t === "account") return kind === "cleaner" ? "Account" : "Login";
		return "Billing";
	}
	if (q.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" });
	if (kind !== "cleaner" && kind !== "team" && kind !== "client") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "Sign in to manage settings."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-lg gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Settings" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1 rounded-lg bg-secondary p-1",
				children: tabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/settings",
					search: { tab: t },
					className: cn("flex-1 rounded-md px-3 py-2 text-center text-sm", active === t ? "bg-paper text-navy shadow-soft" : "text-muted"),
					children: tabLabel(t)
				}, t))
			}),
			active === "profile" ? kind === "cleaner" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MasterProfileSection, {}) : kind === "team" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamProfileSection, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientProfileSection, {}) : active === "account" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountSection, {}) : kind === "client" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientBillingSection, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BillingSection, {})
		]
	});
}
function MasterProfileSection() {
	const q = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const qc = useQueryClient();
	const profile = q.data?.kind === "cleaner" ? q.data.profile : null;
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [business, setBusiness] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [address, setAddress] = (0, import_react.useState)("");
	const [policy, setPolicy] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!profile) return;
		setFullName(profile.full_name);
		setBusiness(profile.business_name ?? "");
		setPhone(profile.phone ?? "");
		setEmail(profile.email ?? "");
		setAddress(profile.address ?? "");
		setPolicy(profile.cancellation_policy ?? "");
	}, [profile]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: async (e) => {
			e.preventDefault();
			setBusy(true);
			try {
				await updateSettings({ data: {
					fullName,
					businessName: business,
					phone,
					email,
					address,
					cancellationPolicy: policy
				} });
				toast.success("Profile saved.");
				await qc.invalidateQueries({ queryKey: ["actor"] });
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Could not save.");
			} finally {
				setBusy(false);
			}
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Display name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: fullName,
					onChange: (e) => setFullName(e.target.value),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Business name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: business,
					onChange: (e) => setBusiness(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Phone",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: phone,
					onChange: (e) => setPhone(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Email",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "email",
					value: email,
					onChange: (e) => setEmail(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Address",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: address,
					onChange: (e) => setAddress(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Cancellation policy",
				hint: "Shown when a client cancels inside 24 hours.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: policy,
					onChange: (e) => setPolicy(e.target.value),
					rows: 4
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Save profile"
			})
		]
	});
}
function TeamProfileSection() {
	const q = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const qc = useQueryClient();
	const profile = q.data?.kind === "team" ? q.data.profile : null;
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!profile) return;
		setFullName(profile.full_name);
		setPhone(profile.phone ?? "");
		setEmail(profile.email ?? "");
	}, [profile]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: async (e) => {
			e.preventDefault();
			setBusy(true);
			try {
				await updateSettings({ data: {
					fullName,
					phone,
					email
				} });
				toast.success("Contact saved.");
				await qc.invalidateQueries({ queryKey: ["actor"] });
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Could not save.");
			} finally {
				setBusy(false);
			}
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: fullName,
					onChange: (e) => setFullName(e.target.value),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Phone",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: phone,
					onChange: (e) => setPhone(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Email",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "email",
					value: email,
					onChange: (e) => setEmail(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Save contact"
			})
		]
	});
}
function ClientProfileSection() {
	const q = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const qc = useQueryClient();
	const profile = q.data?.kind === "client" ? q.data.profile : null;
	const client = q.data?.kind === "client" ? q.data.client : null;
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [address, setAddress] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!profile) return;
		setFullName(profile.full_name);
		setPhone(profile.phone ?? client?.phone ?? "");
		setEmail(profile.email ?? client?.email ?? "");
		setAddress(profile.address ?? client?.address ?? "");
	}, [profile, client]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: async (e) => {
			e.preventDefault();
			setBusy(true);
			try {
				await updateSettings({ data: {
					fullName,
					phone,
					email,
					address
				} });
				toast.success("Contact saved.");
				await qc.invalidateQueries({ queryKey: ["actor"] });
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Could not save.");
			} finally {
				setBusy(false);
			}
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Name",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: fullName,
					onChange: (e) => setFullName(e.target.value),
					required: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Phone",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: phone,
					onChange: (e) => setPhone(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Email",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "email",
					value: email,
					onChange: (e) => setEmail(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Address",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: address,
					onChange: (e) => setAddress(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Save contact"
			})
		]
	});
}
function AccountSection() {
	const user = useCurrentUser();
	const [email, setEmail] = (0, import_react.useState)(user?.primaryEmail ?? "");
	const [current, setCurrent] = (0, import_react.useState)("");
	const [next, setNext] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setEmail(user?.primaryEmail ?? "");
	}, [user?.primaryEmail]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: async (e) => {
				e.preventDefault();
				setBusy(true);
				try {
					await updateAccount({ data: { email } });
					toast.success("Login email updated.");
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Could not update email.");
				} finally {
					setBusy(false);
				}
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Username / login email",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "email",
					value: email,
					onChange: (e) => setEmail(e.target.value),
					required: true
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: "Save login email"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: async (e) => {
				e.preventDefault();
				if (next.length < 8) {
					toast.error("New password must be at least 8 characters.");
					return;
				}
				if (next !== confirm) {
					toast.error("New passwords do not match.");
					return;
				}
				setBusy(true);
				try {
					const { error } = await authClient.changePassword({
						currentPassword: current,
						newPassword: next
					});
					if (error) throw new Error(error.message || "Could not change password.");
					toast.success("Password updated.");
					setCurrent("");
					setNext("");
					setConfirm("");
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Could not change password.");
				} finally {
					setBusy(false);
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg text-navy",
					children: "Change password"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Current password",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						value: current,
						onChange: (e) => setCurrent(e.target.value),
						required: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "New password",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						value: next,
						onChange: (e) => setNext(e.target.value),
						required: true,
						minLength: 8
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Confirm new password",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						value: confirm,
						onChange: (e) => setConfirm(e.target.value),
						required: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: "Update password"
				})
			]
		})]
	});
}
function ClientBillingSection() {
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const clientId = actor.data?.kind === "client" ? actor.data.client.id : "";
	const cards = useQuery({
		queryKey: ["cards", clientId],
		queryFn: () => listCardsForClient({ data: clientId }),
		enabled: Boolean(clientId)
	});
	const qc = useQueryClient();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "The default card is used to pay your cleaner. We keep brand and last four only."
		}), clientId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardManager, {
			clientId,
			cards: cards.data ?? [],
			source: "client",
			onChange: async () => {
				await qc.invalidateQueries({ queryKey: ["cards"] });
				await qc.invalidateQueries({ queryKey: ["dashboard"] });
			}
		}) : null]
	});
}
function BillingSection() {
	const q = useQuery({
		queryKey: ["billing"],
		queryFn: () => listBillingMethods()
	});
	const qc = useQueryClient();
	const [mode, setMode] = (0, import_react.useState)(null);
	const [routing, setRouting] = (0, import_react.useState)("");
	const [account, setAccount] = (0, import_react.useState)("");
	const [holder, setHolder] = (0, import_react.useState)("");
	const [bank, setBank] = (0, import_react.useState)("");
	const [removeId, setRemoveId] = (0, import_react.useState)(null);
	const [removing, setRemoving] = (0, import_react.useState)(false);
	const status = q.data?.planStatus ?? "trial";
	const price = q.data?.planPriceCents ?? 1900;
	const removingMethod = (q.data?.methods ?? []).find((m) => m.id === removeId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.14em] text-sage",
					children: "SweepBook plan"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 font-display text-2xl text-navy",
					children: [money(price), " / month"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm capitalize text-muted",
					children: status === "past_due" ? "Past due" : status
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-muted",
					children: "This is how the owner pays SweepBook — separate from cards used to charge clients."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: (q.data?.methods ?? []).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-wrap items-center justify-between gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [
							m.kind === "ach" ? m.bank_name || "Bank" : brandLabel(m.brand || "card"),
							" · ",
							m.last4
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: m.is_default ? "Default for SweepBook" : m.kind === "ach" ? "ACH" : "Card"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [!m.is_default ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: async () => {
								await setDefaultBillingMethod({ data: m.id });
								await qc.invalidateQueries({ queryKey: ["billing"] });
							},
							children: "Set default"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-sage-soft px-2 py-1 text-xs text-success",
							children: "Default"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => setRemoveId(m.id),
							children: "Remove"
						})]
					})]
				}, m.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => setMode("card"),
					children: "Add card"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => setMode("ach"),
					children: "Add ACH / bank"
				})]
			}),
			mode === "card" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardForm, {
				submitLabel: "Save SweepBook card",
				onSubmit: async (payload) => {
					await addBillingCard({ data: {
						number: payload.number,
						expMonth: payload.expMonth,
						expYear: payload.expYear,
						holderName: payload.holderName
					} });
					toast.success("Card saved.");
					setMode(null);
					await qc.invalidateQueries({ queryKey: ["billing"] });
				}
			}) }) : null,
			mode === "ach" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3",
				onSubmit: async (e) => {
					e.preventDefault();
					try {
						await addBillingAch({ data: {
							routing,
							account,
							holderName: holder,
							bankName: bank
						} });
						toast.success("Bank account saved.");
						setMode(null);
						setRouting("");
						setAccount("");
						await qc.invalidateQueries({ queryKey: ["billing"] });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not save.");
					}
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-md bg-navy px-3 py-2 text-xs text-primary-foreground",
						children: "TEST MODE · We keep last four only."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Name on account",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: holder,
							onChange: (e) => setHolder(e.target.value),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bank name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: bank,
							onChange: (e) => setBank(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Routing number",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							inputMode: "numeric",
							value: routing,
							onChange: (e) => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9)),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Account number",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							inputMode: "numeric",
							value: account,
							onChange: (e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 17)),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						children: "Save bank account"
					})
				]
			}) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				open: Boolean(removeId),
				onOpenChange: (o) => !o && setRemoveId(null),
				title: "Remove card?",
				body: `Are you sure you want to remove ${removingMethod?.kind === "ach" ? removingMethod.bank_name || "bank" : brandLabel(removingMethod?.brand || "card")} ••••${removingMethod?.last4 ?? ""}? This cannot be undone.`,
				busy: removing,
				onConfirm: async () => {
					if (!removeId) return;
					setRemoving(true);
					try {
						await removeBillingMethod({ data: removeId });
						setRemoveId(null);
						await qc.invalidateQueries({ queryKey: ["billing"] });
					} finally {
						setRemoving(false);
					}
				}
			})
		]
	});
}
//#endregion
export { SettingsPage as component };
