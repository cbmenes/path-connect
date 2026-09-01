import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as Button } from "./button-DtbP-xAu.mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as PageHeader } from "./empty-state-BsHYEq_p.mjs";
import { n as Card } from "./card-KluFhvfc.mjs";
import { i as importClients } from "./clients-BpAS2qxp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients.import-dJkTHq3o.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var HEADERS = [
	"name",
	"phone",
	"email",
	"address",
	"notes",
	"usual_day",
	"usual_time",
	"price",
	"frequency"
];
function parseCsv(text) {
	const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
	if (!lines.length) return [];
	const split = (line) => {
		const out = [];
		let cur = "";
		let q = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === "\"") {
				if (q && line[i + 1] === "\"") {
					cur += "\"";
					i++;
				} else q = !q;
			} else if (ch === "," && !q) {
				out.push(cur);
				cur = "";
			} else cur += ch;
		}
		out.push(cur);
		return out.map((s) => s.trim());
	};
	const header = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
	return lines.slice(1).map((line) => {
		const cols = split(line);
		const row = {};
		for (const key of HEADERS) {
			const idx = header.indexOf(key);
			row[key] = idx >= 0 ? cols[idx] ?? "" : "";
		}
		return row;
	});
}
function ImportPage() {
	const [preview, setPreview] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	function onFile(file) {
		const reader = new FileReader();
		reader.onload = () => setPreview(parseCsv(String(reader.result || "")));
		reader.readAsText(file);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Import clients",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/clients-template.csv",
						download: true,
						children: "Download CSV template"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Columns: name, phone, email, address, notes, usual day, usual time, price, frequency. After import you will see a count and any missing fields."
			}),
			!result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-paper px-4 py-8 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-muted",
					children: "Drop a CSV here or choose a file"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: ".csv,text/csv",
					className: "sr-only",
					onChange: (e) => {
						const f = e.target.files?.[0];
						if (f) onFile(f);
					}
				})]
			}), preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-medium",
					children: [preview.length, " rows ready"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 overflow-x-auto text-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "text-xs text-muted",
							children: HEADERS.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pr-3 font-medium",
								children: h.replaceAll("_", " ")
							}, h))
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: preview.slice(0, 8).map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "border-t border-border",
							children: HEADERS.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-1 pr-3",
								children: r[h] || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-warn",
									children: "—"
								})
							}, h))
						}, i)) })]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4",
					disabled: busy,
					onClick: async () => {
						setBusy(true);
						try {
							const res = await importClients({ data: preview });
							setResult(res);
							toast.success(`Imported ${res.importedCount} clients.`);
						} catch (err) {
							toast.error(err instanceof Error ? err.message : "Import failed.");
						} finally {
							setBusy(false);
						}
					},
					children: busy ? "Importing…" : "Import these clients"
				})
			] }) : null] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl text-navy",
						children: "Import review"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Imported ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular font-medium",
							children: result.importedCount
						}),
						" clients",
						result.skipped ? ` · skipped ${result.skipped} empty rows` : "",
						"."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						result.missingCount,
						" household",
						result.missingCount === 1 ? "" : "s",
						" are missing fields. You can fill them in on each profile."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "grid gap-2 text-sm",
						children: result.imported.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between rounded-md bg-secondary px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/clients/$id",
								params: { id: r.id },
								className: "font-medium text-navy",
								children: r.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: r.missing.length ? `Missing: ${r.missing.join(", ")}` : "Complete"
							})]
						}, r.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/clients",
							children: "Back to client list"
						})
					})
				]
			})
		]
	});
}
//#endregion
export { ImportPage as component };
