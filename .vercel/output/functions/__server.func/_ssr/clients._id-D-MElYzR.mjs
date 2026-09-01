import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as brandLabel } from "./card-utils-DAZ5YeNe.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Route$6 } from "./router-CXlM22XK.mjs";
import { n as createInvite } from "./invites-DRu9LSX0.mjs";
import { c as recordOutsidePayment, i as createCardLink, r as chargeCard, t as addCardAuthenticated } from "./payments-Cs2gLR8L.mjs";
import { n as Input, r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { t as CardForm } from "./card-form-TJ1umtGi.mjs";
import { a as formatDateTime, f as money, o as formatHours } from "./time-DJsHuhyu.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { n as VisitStatusBadge, t as InvoiceStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { t as ConfirmDialog } from "./confirm-dialog-CXy6E0yW.mjs";
import { n as CardSelect, t as CardManager } from "./card-manager-CV5nlAtE.mjs";
import { t as AssigneePicker } from "./assignee-picker-7_5jT7tp.mjs";
import { n as deleteClient, o as setClientAssignees, r as getClient, s as updateClient } from "./clients-BpAS2qxp.mjs";
import { t as ClientFields } from "./client-fields-Bbc-jDfC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients._id-D-MElYzR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ClientProfile() {
	const { id } = Route$6.useParams();
	const q = useQuery({
		queryKey: ["client", id],
		queryFn: () => getClient({ data: id })
	});
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [inviteUrl, setInviteUrl] = (0, import_react.useState)(null);
	const [cardLink, setCardLink] = (0, import_react.useState)(null);
	const [collectCard, setCollectCard] = (0, import_react.useState)(false);
	const [chargeOpen, setChargeOpen] = (0, import_react.useState)(false);
	const [outsideOpen, setOutsideOpen] = (0, import_react.useState)(false);
	const [assigneeIds, setAssigneeIds] = (0, import_react.useState)(null);
	const [removeOpen, setRemoveOpen] = (0, import_react.useState)(false);
	const [removing, setRemoving] = (0, import_react.useState)(false);
	if (q.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-xl bg-secondary" });
	if (q.error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-danger",
		children: q.error.message
	});
	const { client, jobs, invoices, cards, staff } = q.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-[0.16em] text-sage",
						children: client.frequency || "client"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl text-navy",
						children: client.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: client.address
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setEditing((v) => !v),
							children: editing ? "Close" : "Edit"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/messages/$clientId",
								params: { clientId: client.id },
								children: "Message"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/jobs/new",
								children: "Schedule"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => setRemoveOpen(true),
							children: "Remove"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg text-navy",
					children: "Household"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-3 grid gap-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Phone",
							v: client.phone
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Email",
							v: client.email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Access",
							v: client.access_notes
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Pets",
							v: client.pets
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Supplies",
							v: client.supplies
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Usual",
							v: `${client.usual_day || "—"} ${client.usual_time || ""}`.trim()
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Price",
							v: client.default_price_cents ? money(client.default_price_cents) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Duration",
							v: client.default_duration_min ? formatHours(client.default_duration_min) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "Notes",
							v: client.notes
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg text-navy",
						children: "Cards on file"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted",
						children: "Brand and last four only. Default is used for charges and tips."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardManager, {
							clientId: client.id,
							cards,
							source: "cleaner",
							onChange: async () => {
								await qc.invalidateQueries({ queryKey: ["client", id] });
							}
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: async () => {
									const res = await createCardLink({ data: client.id });
									const url = `${window.location.origin}${res.path}`;
									setCardLink(url);
									await navigator.clipboard?.writeText(url).catch(() => void 0);
									toast.success("Add-card link copied.");
								},
								children: "Send add-card link"
							}),
							cardLink ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "break-all text-xs text-muted",
								children: cardLink
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setCollectCard((v) => !v),
								children: "Collect card on site"
							}),
							collectCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardForm, {
								submitLabel: "Save as backup card",
								onSubmit: async (payload) => {
									const saved = await addCardAuthenticated({ data: {
										...payload,
										clientId: client.id,
										source: "cleaner"
									} });
									toast.success(`Saved ${brandLabel(saved.brand)} · ${saved.last4}`);
									setCollectCard(false);
									await qc.invalidateQueries({ queryKey: ["client", id] });
								}
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
								open: chargeOpen,
								onOpenChange: setChargeOpen,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Charge a card" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
									title: "Confirm charge",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChargeForm, {
										defaultAmount: client.default_price_cents ?? 15e3,
										name: client.name,
										cards,
										onConfirm: async (amountCents, description, cardId) => {
											const res = await chargeCard({ data: {
												clientId: client.id,
												amountCents,
												description,
												cardId
											} });
											if (res.ok) {
												toast.success(`Paid. Receipt ${res.receiptNumber}`);
												setChargeOpen(false);
												await qc.invalidateQueries({ queryKey: ["client", id] });
											} else toast.error(res.reason);
										}
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
								open: outsideOpen,
								onOpenChange: setOutsideOpen,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										children: "Record cash or Venmo"
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
									title: "Paid outside SweepBook",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutsideForm, {
										clientId: client.id,
										amount: client.default_price_cents ?? 15e3,
										onDone: async () => {
											setOutsideOpen(false);
											await qc.invalidateQueries({ queryKey: ["client", id] });
										}
									})
								})]
							})
						]
					})
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg text-navy",
					children: "Assigned cleaners"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Recurring visits for this household show on each assigned team member’s schedule."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssigneePicker, {
						staff: staff ?? [],
						selected: assigneeIds ?? (client.assignees ?? []).map((a) => a.user_id),
						onChange: setAssigneeIds
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-3",
					variant: "outline",
					onClick: async () => {
						const ids = assigneeIds ?? (client.assignees ?? []).map((a) => a.user_id);
						await setClientAssignees({ data: {
							clientId: client.id,
							userIds: ids
						} });
						toast.success("Assigned cleaners saved.");
						await qc.invalidateQueries({ queryKey: ["client", id] });
						await qc.invalidateQueries({ queryKey: ["jobs"] });
						await qc.invalidateQueries({ queryKey: ["team"] });
					},
					children: "Save"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg text-navy",
						children: "Invite to the portal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: async () => {
							const res = await createInvite({ data: client.id });
							const url = `${window.location.origin}${res.path}`;
							setInviteUrl(url);
							await navigator.clipboard?.writeText(url).catch(() => void 0);
							toast.success("Invite link copied.");
						},
						children: "Copy invite link"
					})]
				}),
				inviteUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 break-all text-xs text-muted",
					children: inviteUrl
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: client.linked_user_id ? "This household already has a portal login." : "They have not joined yet."
				})
			] }),
			editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientFields, {
				initial: {
					name: client.name,
					phone: client.phone ?? void 0,
					email: client.email ?? void 0,
					address: client.address ?? void 0,
					access_notes: client.access_notes ?? void 0,
					pets: client.pets ?? void 0,
					supplies: client.supplies ?? void 0,
					default_price_cents: client.default_price_cents,
					default_duration_min: client.default_duration_min,
					usual_day: client.usual_day ?? void 0,
					usual_time: client.usual_time ?? void 0,
					frequency: client.frequency ?? void 0,
					notes: client.notes ?? void 0
				},
				submitLabel: "Save profile",
				onSubmit: async (input) => {
					await updateClient({ data: {
						...input,
						id: client.id
					} });
					toast.success("Profile saved.");
					setEditing(false);
					await qc.invalidateQueries({ queryKey: ["client", id] });
				}
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Job history"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: jobs.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/jobs/$id",
					params: { id: j.id },
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: formatDateTime(j.start_at)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: money(j.price_cents)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, { job: {
						status: j.status,
						payment_status: null
					} })]
				}, j.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Invoices"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: invoices.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: i.description
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular text-xs text-muted",
						children: money(i.amount_cents)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: i.status })]
				}, i.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				open: removeOpen,
				onOpenChange: setRemoveOpen,
				title: "Remove client?",
				body: `Are you sure you want to remove ${client.name}? This cannot be undone.`,
				busy: removing,
				onConfirm: async () => {
					setRemoving(true);
					try {
						await deleteClient({ data: client.id });
						toast.message("Client removed.");
						setRemoveOpen(false);
						await navigate({ to: "/app/clients" });
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
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-xs uppercase tracking-[0.12em] text-muted",
		children: k
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: v || "—" })] });
}
function ChargeForm({ defaultAmount, name, cards, onConfirm }) {
	const [amt, setAmt] = (0, import_react.useState)((defaultAmount / 100).toFixed(2));
	const [desc, setDesc] = (0, import_react.useState)(`House cleaning — ${name}`);
	const [cardId, setCardId] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Amount",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "number",
					step: "0.01",
					value: amt,
					onChange: (e) => setAmt(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Description",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: desc,
					onChange: (e) => setDesc(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardSelect, {
				cards,
				value: cardId,
				onChange: setCardId
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: () => onConfirm(Math.round(Number(amt) * 100), desc, cardId || void 0),
				children: ["Charge ", money(Math.round(Number(amt) * 100))]
			})
		]
	});
}
function OutsideForm({ clientId, amount, onDone }) {
	const [amt, setAmt] = (0, import_react.useState)((amount / 100).toFixed(2));
	const [method, setMethod] = (0, import_react.useState)("venmo");
	const [desc, setDesc] = (0, import_react.useState)("House cleaning (paid outside SweepBook)");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3",
		onSubmit: async (e) => {
			e.preventDefault();
			const res = await recordOutsidePayment({ data: {
				clientId,
				amountCents: Math.round(Number(amt) * 100),
				description: desc,
				method
			} });
			toast.success(`Recorded. Receipt ${res.receiptNumber}`);
			onDone();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Method",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
					value: method,
					onChange: (e) => setMethod(e.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "venmo",
							children: "Venmo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "cash",
							children: "Cash"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "outside",
							children: "Other"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Amount",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "number",
					step: "0.01",
					value: amt,
					onChange: (e) => setAmt(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Description",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: desc,
					onChange: (e) => setDesc(e.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				children: "Save as paid"
			})
		]
	});
}
//#endregion
export { ClientProfile as component };
