import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as Smartphone, b as ArrowRight, m as CreditCard, u as MessageCircle, v as CalendarCheck } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteChrome } from "./site-chrome-C9ZxDl9a.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DdnqxFR9.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SiteChrome, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.18em] text-sage",
					children: "For independent cleaners"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-4xl leading-[1.1] tracking-tight text-navy md:text-6xl",
					children: "Your books, your clients, one calm website."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-xl text-lg text-muted",
					children: "SweepBook is not a marketplace. You already have clients. Invite them in, run the calendar, take cards, and stop chasing the day through texts and Venmo."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-7 flex flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/signup",
							children: ["Get started ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						variant: "outline",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/login?demo=cleaner",
							children: "See demo"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm text-muted",
					children: "$19/month for the cleaner. Clients are free."
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroPreview, {})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "border-y border-border bg-paper/70",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4",
				children: [
					{
						k: "Invite-only",
						v: "No public cleaner search. You send the link."
					},
					{
						k: "Oklahoma-ready",
						v: "Built around real weekly routes, not gig matching."
					},
					{
						k: "Cards, not chase",
						v: "Charge a saved card. Record Venmo as paid outside."
					},
					{
						k: "Works everywhere",
						v: "Phone, iPad, laptop — same website, same logins."
					}
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xl text-navy",
					children: item.k
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: item.v
				})] }, item.k))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
			id: "scheduling",
			icon: CalendarCheck,
			kicker: "Scheduling",
			title: "One-off visits and a recurring route.",
			body: "Day and week views on a laptop. An agenda on your phone. Weekly, biweekly, and monthly jobs, with a warning if you double-book yourself."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
			id: "payments",
			icon: CreditCard,
			kicker: "Payments",
			title: "A card on file. A receipt after.",
			body: "Clients add a card themselves, or you collect one on site through a secure form. Charge it for later visits. Request a tip. Mark cash or Venmo paid outside SweepBook.",
			flip: true
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
			id: "portal",
			icon: MessageCircle,
			kicker: "Client portal",
			title: "A door for the people you already clean for.",
			body: "They see the next visit, message you, tip after a completed clean, and cancel or reschedule. Inside 24 hours, your cancellation policy is right there."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
			id: "switch",
			icon: Smartphone,
			kicker: "Easy switch",
			title: "Leave the group text without leaving your clients.",
			body: "Import a CSV of names, addresses, and usual days. Invite each household with a link. They keep you — they just stop paying through a chat thread."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			id: "pricing",
			className: "mx-auto max-w-6xl px-4 py-16",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid items-center gap-8 rounded-2xl bg-navy px-6 py-10 text-paper md:grid-cols-[1.2fr_0.8fr] md:px-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-[0.18em] text-sage",
						children: "Pricing"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 font-display text-4xl",
						children: "One plan. Nineteen a month."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-lg text-paper/75",
						children: "SweepBook is for a single independent cleaner. Unlimited clients, visits, messages, and cards. Your clients never pay us."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-5 grid gap-2 text-sm text-paper/85",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Calendar, client records, and messaging" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Secure cards, invoices, tips, and receipts" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "CSV import and invite links" })
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-paper p-6 text-ink",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Cleaner account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-display text-5xl tabular-nums text-navy",
							children: ["$19", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-2xl text-muted",
								children: "/mo"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Clients · Free"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-6 w-full",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/signup",
								children: "Start with your own clients"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-2 w-full",
							variant: "outline",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/login?demo=cleaner",
								children: "Open the demo"
							})
						})
					]
				})]
			})
		})
	] });
}
function Feature({ id, icon: Icon, kicker, title, body, flip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id,
		className: "mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: flip ? "md:order-2" : "",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.18em] text-sage",
					children: kicker
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-3xl text-navy md:text-4xl",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: body
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: flip ? "md:order-1" : "",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl bg-navy p-4 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-paper p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2 text-navy",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: kicker
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-2/3 rounded-full bg-secondary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-full rounded-full bg-sage-soft" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-5/6 rounded-full bg-secondary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 grid grid-cols-3 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-16 rounded-lg bg-sage-soft" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-16 rounded-lg bg-navy/10" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-16 rounded-lg bg-secondary" })
								]
							})
						]
					})]
				})
			})
		})]
	});
}
function HeroPreview() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-2xl bg-navy p-3 shadow-card md:p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl bg-bg p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-lg text-navy",
					children: "Wednesday route"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full bg-sage-soft px-2 py-0.5 text-xs text-success",
					children: "3 visits"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 grid gap-3",
				children: [
					[
						"11:00",
						"Cam Delgado",
						"Bricktown loft",
						"$140"
					],
					[
						"1:00",
						"Jordan Ellis",
						"Midtown bungalow",
						"$160"
					],
					[
						"4:00",
						"Buffer / travel",
						"North on I-235",
						"—"
					]
				].map(([t, n, a, p]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium text-ink",
						children: n
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							t,
							" · ",
							a
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular text-sm text-navy",
						children: p
					})]
				}, n))
			})]
		})
	});
}
//#endregion
export { Home as component };
