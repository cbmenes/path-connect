import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { g as ChevronLeft, h as ChevronRight } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as Route$20 } from "./router-CXlM22XK.mjs";
import { a as listCardsForClient, r as chargeCard } from "./payments-Cs2gLR8L.mjs";
import { n as Input, r as NativeSelect, t as Field } from "./input-DTSEmAWq.mjs";
import { _ as startOfChicagoDay, b as toDatetimeLocalValue, f as money, g as sameChicagoDay, h as partsInChicago, i as formatDate, o as formatHours, r as chicagoDate, s as formatTime, t as addDaysChicago, v as startOfChicagoMonth, y as startOfChicagoWeek } from "./time-DJsHuhyu.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as VisitStatusBadge } from "./status-badge-fbEUC9sJ.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CnJFsucf.mjs";
import { n as CardSelect } from "./card-manager-CV5nlAtE.mjs";
import { r as getMyActor } from "./bootstrap-DqRipktd.mjs";
import { a as getJob, c as updateJob, i as createJob, o as listJobs, s as setJobStatus, t as assignJob } from "./jobs-BanmP-bH.mjs";
import { a as listAssignableStaff } from "./team-B2MC8NJd.mjs";
import { n as assigneeLabel, t as AssigneePicker } from "./assignee-picker-7_5jT7tp.mjs";
import { t as JobForm } from "./job-form-DmztECbD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/calendar-2mWQiedL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function parseAnchor(date) {
	if (!date) return startOfChicagoDay(/* @__PURE__ */ new Date());
	const [y, m, d] = date.split("-").map(Number);
	if (!y || !m || !d) return startOfChicagoDay(/* @__PURE__ */ new Date());
	return chicagoDate(y, m, d, 0, 0);
}
function isoDay(d) {
	const p = partsInChicago(d);
	return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
function CalendarPage() {
	const search = Route$20.useSearch();
	const navigate = useNavigate();
	const actor = useQuery({
		queryKey: ["actor"],
		queryFn: () => getMyActor()
	});
	const qc = useQueryClient();
	const isMaster = actor.data?.kind === "cleaner";
	const isTeam = actor.data?.kind === "team";
	const [mode, setMode] = (0, import_react.useState)(search.view ?? "week");
	const [anchor, setAnchor] = (0, import_react.useState)(() => parseAnchor(search.date));
	const [addStart, setAddStart] = (0, import_react.useState)(search.start ?? null);
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const range = (0, import_react.useMemo)(() => {
		if (mode === "month") {
			const monthStart = startOfChicagoMonth(anchor);
			const gridStart = startOfChicagoWeek(monthStart);
			return {
				from: gridStart,
				to: addDaysChicago(gridStart, 42)
			};
		}
		if (mode === "day") {
			const from = startOfChicagoDay(anchor);
			return {
				from,
				to: addDaysChicago(from, 1)
			};
		}
		const from = startOfChicagoWeek(anchor);
		return {
			from,
			to: addDaysChicago(from, 7)
		};
	}, [anchor, mode]);
	const jobs = useQuery({
		queryKey: [
			"jobs",
			range.from.toISOString(),
			range.to.toISOString()
		],
		queryFn: () => listJobs({ data: {
			from: range.from.toISOString(),
			to: range.to.toISOString()
		} }),
		refetchOnMount: "always"
	});
	const days = (0, import_react.useMemo)(() => {
		const n = mode === "month" ? 42 : mode === "week" ? 7 : 1;
		const start = mode === "month" ? startOfChicagoWeek(startOfChicagoMonth(anchor)) : range.from;
		return Array.from({ length: n }, (_, i) => addDaysChicago(start, i));
	}, [
		anchor,
		mode,
		range.from
	]);
	function setView(next, day) {
		const d = day ?? anchor;
		setMode(next);
		setAnchor(startOfChicagoDay(d));
		navigate({
			to: "/app/calendar",
			search: {
				view: next,
				date: isoDay(d)
			},
			replace: true
		});
	}
	function shift(dir) {
		const delta = mode === "month" ? dir * 28 : mode === "week" ? dir * 7 : dir;
		const next = addDaysChicago(anchor, delta);
		setAnchor(next);
		navigate({
			to: "/app/calendar",
			search: {
				view: mode,
				date: isoDay(next)
			},
			replace: true
		});
	}
	if (actor.data?.kind === "client") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, { title: "Calendar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-2 text-sm text-muted",
		children: [
			"Your visits live on the",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/app/visits",
				className: "text-navy underline",
				children: "Visits"
			}),
			" ",
			"page."
		]
	})] });
	const title = mode === "month" ? formatDate(startOfChicagoMonth(anchor), {
		month: "long",
		year: "numeric"
	}) : mode === "week" ? `${formatDate(range.from, {
		month: "long",
		day: "numeric"
	})} – ${formatDate(addDaysChicago(range.from, 6), {
		month: "short",
		day: "numeric"
	})}` : formatDate(range.from, {
		weekday: "long",
		month: "long",
		day: "numeric"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Calendar",
				action: isMaster ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setAddStart(toDatetimeLocalValue(/* @__PURE__ */ new Date())),
					children: "New visit"
				}) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => shift(-1),
							"aria-label": "Previous",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "min-w-40 text-center font-medium",
							children: title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => shift(1),
							"aria-label": "Next",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [[
						"day",
						"week",
						"month"
					].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: mode === v ? "primary" : "outline",
						size: "sm",
						onClick: () => setView(v),
						children: v[0].toUpperCase() + v.slice(1)
					}, v)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => {
							const t = startOfChicagoDay(/* @__PURE__ */ new Date());
							setAnchor(t);
							navigate({
								to: "/app/calendar",
								search: {
									view: mode,
									date: isoDay(t)
								},
								replace: true
							});
						},
						children: "Today"
					})]
				})]
			}),
			mode === "month" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthGrid, {
				days,
				jobs: jobs.data ?? [],
				onEmpty: (day) => {
					if (!isMaster) return;
					const p = partsInChicago(day);
					setAddStart(toDatetimeLocalValue(chicagoDate(p.year, p.month, p.day, 9, 0)));
				},
				onJob: (j) => setSelectedId(j.id)
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeekGrid, {
					days,
					jobs: jobs.data ?? [],
					onEmpty: (dt) => {
						if (!isMaster) return;
						setAddStart(toDatetimeLocalValue(dt));
					},
					onJob: (j) => setSelectedId(j.id)
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Agenda, {
					days,
					jobs: jobs.data ?? [],
					hideMoney: Boolean(isTeam),
					onEmpty: (day) => {
						if (!isMaster) return;
						const p = partsInChicago(day);
						setAddStart(toDatetimeLocalValue(chicagoDate(p.year, p.month, p.day, 9, 0)));
					},
					onJob: (j) => setSelectedId(j.id)
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(addStart),
				onOpenChange: (o) => !o && setAddStart(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					title: "Add appointment",
					className: "max-h-[90dvh] w-[min(100%-1.5rem,36rem)] overflow-y-auto",
					children: addStart ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobForm, {
						showAssign: isMaster,
						initial: {
							startLocal: addStart,
							durationMin: 120,
							recurrence: "none"
						},
						submitting: busy,
						submitLabel: "Add to the book",
						onSubmit: async (input) => {
							setBusy(true);
							try {
								const res = await createJob({ data: input });
								toast.success(res.count > 1 ? `Created ${res.count} visits.` : "Visit saved.");
								if (res.conflictCount) toast.message(`${res.conflictCount} overlap warning${res.conflictCount === 1 ? "" : "s"}.`);
								setAddStart(null);
								await qc.invalidateQueries({ queryKey: ["jobs"] });
								await qc.invalidateQueries({ queryKey: ["dashboard"] });
								if (input.startLocal) {
									const day = fromStart(input.startLocal);
									setAnchor(day);
									navigate({
										to: "/app/calendar",
										search: {
											view: mode,
											date: isoDay(day)
										},
										replace: true
									});
								}
							} catch (err) {
								toast.error(err instanceof Error ? err.message : "Could not save.");
							} finally {
								setBusy(false);
							}
						}
					}, addStart) : null
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(selectedId),
				onOpenChange: (o) => !o && setSelectedId(null),
				children: selectedId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobPanel, {
					id: selectedId,
					canEdit: Boolean(isMaster),
					isTeam: Boolean(isTeam),
					canMessage: actor.data?.kind === "cleaner" || actor.data?.kind === "team" && actor.data.canMessage,
					onClose: () => setSelectedId(null),
					onChanged: async () => {
						await qc.invalidateQueries({ queryKey: ["jobs"] });
						await qc.invalidateQueries({ queryKey: ["job", selectedId] });
						await qc.invalidateQueries({ queryKey: ["invoices"] });
						await qc.invalidateQueries({ queryKey: ["dashboard"] });
					}
				}) : null
			})
		]
	});
}
function fromStart(startLocal) {
	const [date] = startLocal.split("T");
	const [y, m, d] = date.split("-").map(Number);
	return chicagoDate(y, m, d, 0, 0);
}
function jobsOnDay(jobs, day) {
	return jobs.filter((j) => j.status !== "cancelled" && sameChicagoDay(j.start_at, day));
}
function WeekGrid({ days, jobs, onEmpty, onJob }) {
	const hours = Array.from({ length: 13 }, (_, i) => i + 7);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-x-auto rounded-xl bg-paper shadow-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid min-w-[56rem] grid-cols-8 border-b border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-2 text-xs text-muted" }), days.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("p-2 text-center text-xs font-medium text-navy", sameChicagoDay(d, /* @__PURE__ */ new Date()) && "bg-sage-soft"),
				children: [formatDate(d, { weekday: "short" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-lg tabular-nums",
					children: partsInChicago(d).day
				})]
			}, d.toISOString()))]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative grid min-w-[56rem] grid-cols-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: hours.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "h-16 border-b border-border px-2 text-[11px] text-muted",
				children: [h > 12 ? h - 12 : h, h >= 12 ? "pm" : "am"]
			}, h)) }), days.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative border-l border-border",
				children: [hours.map((h) => {
					const p = partsInChicago(d);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-16 w-full border-b border-border/80 hover:bg-sage-soft/50",
						onClick: () => onEmpty(chicagoDate(p.year, p.month, p.day, h, 0)),
						"aria-label": `Add visit at ${h}:00`
					}, h);
				}), jobsOnDay(jobs, d).map((j) => {
					const p = partsInChicago(j.start_at);
					const top = (p.hour + p.minute / 60 - 7) / 13 * 100;
					const height = j.duration_min / 60 / 13 * 100;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: (e) => {
							e.stopPropagation();
							onJob(j);
						},
						className: "absolute inset-x-1 overflow-hidden rounded-md bg-navy px-1.5 py-1 text-left text-paper",
						style: {
							top: `${Math.max(0, top)}%`,
							height: `${Math.max(8, height)}%`
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[11px] font-medium",
							children: j.client_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-[10px] text-paper/70",
							children: [
								formatTime(j.start_at),
								" · ",
								formatHours(j.duration_min),
								j.assignees?.length ? ` · ${assigneeLabel(j.assignees)}` : j.assignee_name ? ` · ${j.assignee_name.split(" ")[0]}` : ""
							]
						})]
					}, j.id);
				})]
			}, d.toISOString()))]
		})]
	});
}
function MonthGrid({ days, jobs, onEmpty, onJob }) {
	const month = partsInChicago(days[15] ?? days[0]).month;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-xl bg-paper shadow-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-7 border-b border-border",
			children: [
				"Sun",
				"Mon",
				"Tue",
				"Wed",
				"Thu",
				"Fri",
				"Sat"
			].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted",
				children: d
			}, d))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-7",
			children: days.map((d) => {
				const list = jobsOnDay(jobs, d);
				const inMonth = partsInChicago(d).month === month;
				const today = sameChicagoDay(d, /* @__PURE__ */ new Date());
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onEmpty(d),
					className: cn("min-h-24 border-b border-r border-border p-1.5 text-left align-top", !inMonth && "bg-secondary/40 text-muted", today && "bg-sage-soft"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("text-xs font-medium", today && "text-navy"),
						children: partsInChicago(d).day
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 grid gap-0.5",
						children: [list.slice(0, 3).map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							role: "link",
							tabIndex: 0,
							onClick: (e) => {
								e.stopPropagation();
								onJob(j);
							},
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									e.stopPropagation();
									onJob(j);
								}
							},
							className: "block truncate rounded bg-navy px-1 py-0.5 text-[10px] text-paper",
							children: [
								formatTime(j.start_at),
								" ",
								j.client_name,
								j.assignees?.length ? ` ${assigneeLabel(j.assignees)}` : ""
							]
						}, j.id)), list.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[10px] text-muted",
							children: [
								"+",
								list.length - 3,
								" more"
							]
						}) : null]
					})]
				}, d.toISOString());
			})
		})]
	});
}
function Agenda({ days, jobs, hideMoney, onEmpty, onJob }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-4",
		children: days.map((d) => {
			const list = jobsOnDay(jobs, d);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: cn("text-sm font-medium text-navy", sameChicagoDay(d, /* @__PURE__ */ new Date()) && "text-sage"),
					children: formatDate(d, {
						weekday: "long",
						month: "short",
						day: "numeric"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => onEmpty(d),
					children: "Add"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid gap-2",
				children: list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rounded-lg border border-dashed border-border px-3 py-4 text-left text-sm text-muted",
					onClick: () => onEmpty(d),
					children: "No visits. Tap to add."
				}) : list.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onJob(j),
					className: "flex items-center justify-between rounded-lg bg-paper px-3 py-3 text-left shadow-soft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: j.client_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							formatTime(j.start_at),
							" · ",
							formatHours(j.duration_min),
							hideMoney ? "" : ` · ${money(j.price_cents)}`,
							j.assignees?.length ? ` · ${assigneeLabel(j.assignees)}` : j.assignee_name ? ` · ${j.assignee_name.split(" ")[0]}` : ""
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, {
						job: j,
						hideMoney
					})]
				}, j.id))
			})] }, d.toISOString());
		})
	});
}
function JobPanel({ id, canEdit, isTeam, canMessage, onClose, onChanged }) {
	const q = useQuery({
		queryKey: ["job", id],
		queryFn: () => getJob({ data: id })
	});
	const staff = useQuery({
		queryKey: ["staff"],
		queryFn: () => listAssignableStaff(),
		enabled: canEdit
	});
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [chargeOpen, setChargeOpen] = (0, import_react.useState)(false);
	const [amt, setAmt] = (0, import_react.useState)("");
	const [desc, setDesc] = (0, import_react.useState)("");
	const [cardId, setCardId] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [assigneeIds, setAssigneeIds] = (0, import_react.useState)(null);
	const [assignScope, setAssignScope] = (0, import_react.useState)("visit");
	const cards = useQuery({
		queryKey: ["cards", q.data?.job.client_id],
		queryFn: () => listCardsForClient({ data: q.data.job.client_id }),
		enabled: Boolean(q.data?.job.client_id) && canEdit
	});
	if (q.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
		title: "Visit",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 animate-pulse rounded-xl bg-secondary" })
	});
	if (q.error || !q.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
		title: "Visit",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-danger",
			children: q.error?.message || "Not found."
		})
	});
	const { job } = q.data;
	const currentIds = (job.assignees ?? []).map((a) => a.user_id);
	const selectedIds = assigneeIds ?? currentIds;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
		title: job.client_name,
		className: "max-h-[90dvh] w-[min(100%-1.5rem,32rem)] overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitStatusBadge, {
						job,
						hideMoney: isTeam
					}), isTeam ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular text-navy",
						children: money(job.price_cents)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						formatDate(job.start_at, {
							weekday: "long",
							month: "long",
							day: "numeric"
						}),
						" · ",
						formatTime(job.start_at),
						" ·",
						" ",
						formatHours(job.duration_min)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: job.address
				}),
				job.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: job.notes
				}) : null,
				job.assignees?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: ["Assigned to ", job.assignees.map((a) => a.full_name).join(", ")]
				}) : job.assignee_name ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: ["Assigned to ", job.assignee_name]
				}) : null,
				canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 rounded-xl bg-secondary p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Assigned cleaners"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssigneePicker, {
							staff: staff.data ?? [],
							selected: selectedIds,
							onChange: setAssigneeIds
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Apply assignment",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
								value: assignScope,
								onChange: (e) => setAssignScope(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "visit",
									children: "Apply to this visit only"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "client_recurring",
									children: "Apply to this client's recurring jobs"
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: async () => {
								await assignJob({ data: {
									id: job.id,
									assignedToUserIds: selectedIds,
									scope: assignScope
								} });
								toast.success(assignScope === "visit" ? "This visit updated." : "Recurring jobs updated.");
								await onChanged();
							},
							children: "Save assignees"
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setEditing((v) => !v),
							children: editing ? "Close editor" : "Edit"
						}) : null,
						canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: async () => {
								await setJobStatus({ data: {
									id: job.id,
									status: "cancelled",
									reason: "Cancelled by cleaner"
								} });
								toast.message("Visit cancelled.");
								await onChanged();
								onClose();
							},
							children: "Cancel"
						}) : null,
						canMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/messages/$clientId",
								params: { clientId: job.client_id },
								children: "Message"
							})
						}) : null,
						canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							onClick: () => {
								setAmt((job.price_cents / 100).toFixed(2));
								setDesc(`${job.service} — ${job.client_name}`);
								setChargeOpen(true);
							},
							children: "Charge / collect"
						}) : null
					]
				}),
				chargeOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 rounded-xl bg-secondary p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Confirm charge"
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardSelect, {
							cards: cards.data ?? [],
							value: cardId,
							onChange: setCardId
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							disabled: busy,
							onClick: async () => {
								setBusy(true);
								try {
									const res = await chargeCard({ data: {
										clientId: job.client_id,
										amountCents: Math.round(Number(amt) * 100),
										description: desc,
										jobId: job.id,
										cardId: cardId || void 0
									} });
									if (res.ok) {
										toast.success(`Paid. Receipt ${res.receiptNumber}. ${res.brand} · ${res.last4}`);
										setChargeOpen(false);
										await onChanged();
									} else toast.error(res.reason);
								} catch (err) {
									toast.error(err instanceof Error ? err.message : "Charge failed.");
								} finally {
									setBusy(false);
								}
							},
							children: busy ? "Charging…" : `Charge ${money(Math.round(Number(amt) * 100) || 0)}`
						})
					]
				}) : null,
				editing && canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobForm, {
					showAssign: true,
					initial: {
						id: job.id,
						clientId: job.client_id,
						service: job.service,
						address: job.address ?? "",
						startLocal: toDatetimeLocalValue(job.start_at),
						durationMin: job.duration_min,
						priceCents: job.price_cents,
						notes: job.notes ?? "",
						recurrence: "none",
						assignedToUserIds: (job.assignees ?? []).map((a) => a.user_id)
					},
					submitLabel: "Save visit",
					onSubmit: async (input) => {
						const res = await updateJob({ data: {
							...input,
							id: job.id
						} });
						toast.success(res.conflictCount ? "Saved with an overlap warning." : "Visit updated.");
						setEditing(false);
						await onChanged();
					}
				}) : null
			]
		})
	});
}
//#endregion
export { CalendarPage as component };
