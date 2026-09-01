import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { f as tipJob, s as payInvoiceAsClient } from "./payments-Cs2gLR8L.mjs";
import { a as formatDateTime, f as money, o as formatHours } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { n as VisitStatusBadge, t as InvoiceStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { n as CardSelect } from "./card-manager-CV5nlAtE.mjs";
import { i as isTeamDash, n as isCleanerDash, r as isClientDash, t as getDashboard } from "./dashboard-BnZLOo9R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-C6D5r76n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppHome() {
	const q = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => getDashboard()
	});
	if (q.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-xl bg-secondary" });
	if (q.error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-danger",
		children: q.error.message
	});
	const data = q.data;
	if (!data) return null;
	if (isCleanerDash(data)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CleanerHome, { data });
	if (isTeamDash(data)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamHome, { data });
	if (isClientDash(data)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientHome, { data });
	if (data.actor.kind === "client_unlinked") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-3xl text-navy",
		children: "Waiting on an invite"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-2 max-w-md text-muted",
		children: "Ask your cleaner for an invite link. Once you open it while signed in, their visits and messages will appear here."
	})] });
	return null;
}
function CleanerHome({ data }) {
	const actor = data.actor;
	const today = data.today;
	const week = data.week;
	const unpaid = data.unpaid;
	const threads = data.threads;
	const failed = data.failed;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: actor.profile.business_name || "SweepBook",
				title: `Good day, ${actor.profile.full_name.split(" ")[0]}.`,
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/jobs/new",
						children: "New visit"
					})
				})
			}),
			failed.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger",
				children: [
					failed.length,
					" failed payment",
					failed.length === 1 ? "" : "s",
					". Ask the client to update their card."
				]
			}) : null,
			data.pendingRequests ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/app/notifications",
				className: "rounded-xl border border-sage/40 bg-sage-soft p-4 text-sm text-navy",
				children: [
					data.pendingRequests,
					" cancel/reschedule request",
					data.pendingRequests === 1 ? "" : "s",
					" need a decision."
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Today",
						value: String(today.length),
						hint: "visits on the book"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Unpaid",
						value: money(unpaid.reduce((n, i) => n + i.amount_cents, 0)),
						hint: `${unpaid.length} invoices`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Messages",
						value: String(data.unread ?? 0),
						hint: "unread"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Requests",
						value: String(data.pendingRequests ?? 0),
						hint: "cancel / reschedule"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl text-navy",
					children: "Revenue"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Paid visits only — not unpaid invoices or your SweepBook subscription."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid gap-4 md:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "This month",
							value: money(data.revenue.monthCents),
							hint: data.revenue.monthLabel
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Year to date",
							value: money(data.revenue.ytdCents),
							hint: `Jan 1 – now, ${data.revenue.year}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Annual",
							value: money(data.revenue.annualCents),
							hint: `Full calendar year ${data.revenue.year}`
						})
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Today"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: today.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No visits today. Enjoy the gap, or add a one-off."
				}) : today.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/jobs/$id",
					params: { id: j.id },
					className: "block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "flex items-center justify-between gap-3 p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: j.client_name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									formatDateTime(j.start_at),
									" · ",
									formatHours(j.duration_min)
								]
							}),
							j.assignees?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: j.assignees.map((a) => a.full_name).join(", ")
							}) : null
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "tabular text-navy",
							children: money(j.price_cents)
						})]
					})
				}, j.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Next 7 days"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: week.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/jobs/$id",
					params: { id: j.id },
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: j.client_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: formatDateTime(j.start_at)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, { job: j })]
				}, j.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl text-navy",
						children: "Unpaid invoices"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/payments",
						className: "text-sm text-navy underline-offset-4 hover:underline",
						children: "All payments"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid gap-2",
					children: unpaid.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Nothing outstanding."
					}) : unpaid.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "flex items-center justify-between p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: i.client_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: i.description
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "tabular",
								children: money(i.amount_cents)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceStatusBadge, { status: i.status })]
						})]
					}, i.id))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl text-navy",
						children: "Messages"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/messages",
						className: "text-sm text-navy underline-offset-4 hover:underline",
						children: "Inbox"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid gap-2",
					children: threads.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/app/messages/$clientId",
						params: { clientId: t.client_id },
						className: "rounded-lg bg-paper px-3 py-3 shadow-soft",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium",
								children: t.client_name
							}), t.unread ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-navy px-2 text-xs text-paper",
								children: t.unread
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted",
							children: t.last_body
						})]
					}, t.client_id))
				})] })]
			})
		]
	});
}
function TeamHome({ data }) {
	const actor = data.actor;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "Team cleaner",
				title: `Hi, ${actor.profile.full_name.split(" ")[0]}.`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Today",
						value: String(data.today.length),
						hint: "assigned visits"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "This week",
						value: String(data.week.length),
						hint: "on your book"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Requests",
						value: String(data.pendingRequests),
						hint: "need a look"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Today"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: data.today.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Nothing assigned today."
				}) : data.today.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/jobs/$id",
					params: { id: j.id },
					className: "block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "flex items-center justify-between gap-3 p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: j.client_name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									formatDateTime(j.start_at),
									" · ",
									formatHours(j.duration_min)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: j.address
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, {
							job: j,
							hideMoney: true
						})]
					})
				}, j.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Next 7 days"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: data.week.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/jobs/$id",
					params: { id: j.id },
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: j.client_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							formatDateTime(j.start_at),
							" · ",
							formatHours(j.duration_min)
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, {
						job: j,
						hideMoney: true
					})]
				}, j.id))
			})] })
		]
	});
}
function Stat({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs uppercase tracking-[0.14em] text-muted",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-3xl tabular-nums text-navy",
			children: value
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: hint
		})
	] });
}
function ClientHome({ data }) {
	const actor = data.actor;
	const next = data.next;
	const unpaid = data.unpaid;
	const past = data.past.filter((j) => j.status !== "cancelled");
	const qc = useQueryClient();
	const [tipFor, setTipFor] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [payCardId, setPayCardId] = (0, import_react.useState)("");
	const [tipCardId, setTipCardId] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: actor.cleanerName,
				title: `Hello, ${actor.profile.full_name.split(" ")[0]}.`
			}),
			data.failedCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger",
				children: [
					"A card was declined.",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/card",
						className: "underline",
						children: "Update your card"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "bg-navy text-paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.16em] text-paper/60",
					children: "Next cleaning"
				}), next ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 font-display text-3xl",
						children: formatDateTime(next.start_at)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-paper/80",
						children: [
							next.duration_min ? `${formatHours(next.duration_min)} · ` : "",
							money(next.price_cents),
							" · ",
							actor.cleanerName
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-paper/70",
						children: next.address
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "accent",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/visits",
								children: "Manage visits"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							className: "border-paper/20 bg-transparent text-paper hover:bg-paper/10",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/messages",
								children: "Message"
							})
						})]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-paper/80",
					children: "No upcoming visit on the book."
				})]
			}),
			unpaid.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "To pay"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: unpaid.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "grid gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: i.description
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "tabular text-sm text-muted",
							children: money(i.amount_cents)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							disabled: busy,
							onClick: async () => {
								setBusy(true);
								try {
									const res = await payInvoiceAsClient({ data: {
										invoiceId: i.id,
										cardId: payCardId || void 0
									} });
									if (res.ok) toast.success(`Paid. Receipt ${res.receiptNumber}`);
									else toast.error(res.reason);
									await qc.invalidateQueries({ queryKey: ["dashboard"] });
								} catch (err) {
									toast.error(err instanceof Error ? err.message : "Payment failed.");
								} finally {
									setBusy(false);
								}
							},
							children: "Pay now"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardSelect, {
						cards: data.cards,
						value: payCardId,
						onChange: setPayCardId
					})]
				}, i.id))
			})] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl text-navy",
				children: "Tip after a visit"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-2",
				children: past.slice(0, 3).map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: formatDateTime(j.start_at)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: j.tip_cents ? `Tipped ${money(j.tip_cents)}` : "No tip yet"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
						open: tipFor === j.id,
						onOpenChange: (o) => setTipFor(o ? j.id : null),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								children: "Leave a tip"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
							title: "Leave a tip",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-3 gap-2",
									children: [
										500,
										1e3,
										2e3
									].map((amt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "outline",
										onClick: async () => {
											try {
												const res = await tipJob({ data: {
													jobId: j.id,
													amountCents: amt,
													cardId: tipCardId || void 0
												} });
												if (res.ok) {
													toast.success(`Tip sent. Receipt ${res.receiptNumber}`);
													setTipFor(null);
													await qc.invalidateQueries({ queryKey: ["dashboard"] });
												} else toast.error(res.reason);
											} catch (err) {
												toast.error(err instanceof Error ? err.message : "Tip failed.");
											}
										},
										children: money(amt)
									}, amt))
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardSelect, {
									cards: data.cards,
									value: tipCardId,
									onChange: setTipCardId
								})]
							})
						})]
					})]
				}, j.id))
			})] })
		]
	});
}
//#endregion
export { AppHome as component };
