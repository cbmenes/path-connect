import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Input, t as Field } from "./input-DTSEmAWq.mjs";
import { n as PageHeader, t as EmptyState } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { t as ConfirmDialog } from "./confirm-dialog-CXy6E0yW.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { c as setTeamMessaging, l as updateTeamMember, n as createTeamInvite, o as listTeam, r as deleteTeamMember, s as resendTeamInvite } from "./team-B2MC8NJd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-By61VEG7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TeamPage() {
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const q = useQuery({
		queryKey: ["team"],
		queryFn: () => listTeam()
	});
	const qc = useQueryClient();
	const [name, setName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [canMessage, setCanMessage] = (0, import_react.useState)(true);
	const [inviteUrl, setInviteUrl] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [removeTarget, setRemoveTarget] = (0, import_react.useState)(null);
	const [removing, setRemoving] = (0, import_react.useState)(false);
	if (actor.data && actor.data.kind !== "cleaner") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "Only the account owner manages the team."
	});
	const members = q.data?.members ?? [];
	const clients = q.data?.clients ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Team" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-xl text-sm text-muted",
				children: "Invite cleaners who already work with you. They see only the jobs you assign — never cards, charges, or billing."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: "Team messaging"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Allow team cleaners to message clients on assigned jobs."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: q.data?.teamMessagingEnabled ? "primary" : "outline",
					onClick: async () => {
						await setTeamMessaging({ data: !q.data?.teamMessagingEnabled });
						await qc.invalidateQueries({ queryKey: ["team"] });
					},
					children: q.data?.teamMessagingEnabled ? "On" : "Off"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg text-navy",
					children: "Add a cleaner"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-3 grid gap-3 md:grid-cols-2",
					onSubmit: async (e) => {
						e.preventDefault();
						setBusy(true);
						try {
							const res = await createTeamInvite({ data: {
								name,
								phone,
								email,
								canMessage
							} });
							const url = `${window.location.origin}${res.path}`;
							setInviteUrl(url);
							await navigator.clipboard?.writeText(url).catch(() => void 0);
							toast.success("Invite link copied.");
							setName("");
							setPhone("");
							setEmail("");
							await qc.invalidateQueries({ queryKey: ["team"] });
						} catch (err) {
							toast.error(err instanceof Error ? err.message : "Could not create invite.");
						} finally {
							setBusy(false);
						}
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: name,
								onChange: (e) => setName(e.target.value),
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: canMessage,
								onChange: (e) => setCanMessage(e.target.checked)
							}), "Can message clients"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: busy,
								children: busy ? "Creating…" : "Send invite link"
							})
						})
					]
				}),
				inviteUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 break-all text-xs text-muted",
					children: inviteUrl
				}) : null
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Cleaners"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: members.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "No team yet",
					body: "Add someone you already work with. They get their own login from the invite link."
				}) : members.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-wrap items-center justify-between gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: m.full_name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								m.email || m.phone || "No contact",
								" · ",
								m.pending ? "Pending invite" : m.team_status
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: m.assigned_clients.length ? `Clients: ${m.assigned_clients.map((c) => c.name).join(", ")}` : "No clients assigned"
						}),
						m.invite_token ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 break-all text-[11px] text-muted",
							children: typeof window !== "undefined" ? `${window.location.origin}/team-invite/${m.invite_token}` : m.invite_token
						}) : null
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [m.pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: async () => {
								const res = await resendTeamInvite({ data: { inviteToken: m.invite_token } });
								const url = `${window.location.origin}${res.path}`;
								await navigator.clipboard?.writeText(url).catch(() => void 0);
								toast.success("Invite link copied.");
							},
							children: "Resend invite"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: async () => {
								await updateTeamMember({ data: {
									userId: m.user_id,
									canMessage: !m.can_message
								} });
								toast.message(m.can_message ? "Messaging off." : "Messaging on.");
								await qc.invalidateQueries({ queryKey: ["team"] });
							},
							children: ["Messaging: ", m.can_message ? "On" : "Off"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setEditing(m),
							children: "Edit"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => setRemoveTarget(m),
							children: "Remove"
						})]
					})]
				}, m.user_id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(editing),
				onOpenChange: (o) => !o && setEditing(null),
				children: editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditMember, {
					member: editing,
					clients,
					onClose: () => setEditing(null),
					onSaved: async () => {
						setEditing(null);
						await qc.invalidateQueries({ queryKey: ["team"] });
						await qc.invalidateQueries({ queryKey: ["jobs"] });
					}
				}) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				open: Boolean(removeTarget),
				onOpenChange: (o) => !o && setRemoveTarget(null),
				title: "Remove team cleaner?",
				body: `Are you sure you want to remove ${removeTarget?.full_name ?? "this cleaner"}? This cannot be undone.`,
				busy: removing,
				onConfirm: async () => {
					if (!removeTarget) return;
					setRemoving(true);
					try {
						await deleteTeamMember({ data: {
							userId: removeTarget.user_id,
							pending: removeTarget.pending
						} });
						toast.message("Removed.");
						setRemoveTarget(null);
						await qc.invalidateQueries({ queryKey: ["team"] });
						await qc.invalidateQueries({ queryKey: ["jobs"] });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not remove.");
					} finally {
						setRemoving(false);
					}
				}
			})
		]
	});
}
function EditMember({ member, clients, onClose, onSaved }) {
	const [fullName, setFullName] = (0, import_react.useState)(member.full_name);
	const [phone, setPhone] = (0, import_react.useState)(member.phone ?? "");
	const [email, setEmail] = (0, import_react.useState)(member.email ?? "");
	const [active, setActive] = (0, import_react.useState)(member.team_status !== "disabled");
	const [messaging, setMessaging] = (0, import_react.useState)(member.can_message);
	const [assigned, setAssigned] = (0, import_react.useState)(member.assigned_clients.map((c) => c.id));
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
		title: `Edit ${member.full_name}`,
		className: "max-h-[90dvh] overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: async (e) => {
				e.preventDefault();
				setBusy(true);
				try {
					await updateTeamMember({ data: {
						userId: member.user_id,
						fullName,
						phone,
						email,
						canMessage: messaging,
						status: active ? "active" : "disabled",
						assignedClientIds: assigned
					} });
					toast.success("Team cleaner updated.");
					await onSaved();
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex min-h-11 items-center gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: active,
						onChange: (e) => setActive(e.target.checked)
					}), "Active"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => setMessaging((v) => !v),
					children: ["Messaging: ", messaging ? "On" : "Off"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: "Assigned clients"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Their recurring jobs appear on this cleaner’s schedule."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 grid gap-1",
						children: clients.map((c) => {
							const on = assigned.includes(c.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-h-11 items-center gap-2 rounded-md px-2 hover:bg-secondary",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: on,
									onChange: () => setAssigned(on ? assigned.filter((id) => id !== c.id) : [...assigned, c.id])
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm",
									children: c.name
								})]
							}, c.id);
						})
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: async () => {
						const res = await resendTeamInvite({ data: {
							userId: member.user_id,
							inviteToken: member.invite_token
						} });
						const url = `${window.location.origin}${res.path}`;
						await navigator.clipboard?.writeText(url).catch(() => void 0);
						toast.success("Invite link copied.");
					},
					children: "Resend invite"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Saving…" : "Save"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: onClose,
						children: "Cancel"
					})]
				})
			]
		})
	});
}
//#endregion
export { TeamPage as component };
