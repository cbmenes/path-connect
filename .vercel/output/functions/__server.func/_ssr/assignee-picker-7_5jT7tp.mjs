import { n as initials } from "./utils-2pyTGW3_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/assignee-picker-7_5jT7tp.js
var import_jsx_runtime = require_jsx_runtime();
function AssigneePicker({ staff, selected, onChange }) {
	if (!staff.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "No team cleaners yet. Invite someone from the Team tab."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-1.5",
		children: staff.map((s) => {
			const on = selected.includes(s.user_id);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-secondary",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: on,
						onChange: () => {
							onChange(on ? selected.filter((id) => id !== s.user_id) : [...selected, s.user_id]);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-8 place-items-center rounded-full bg-navy text-[11px] font-semibold text-paper",
						children: initials(s.full_name)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm",
						children: s.full_name
					})
				]
			}, s.user_id);
		})
	});
}
function assigneeLabel(assignees) {
	if (!assignees.length) return "";
	return assignees.map((a) => initials(a.full_name)).join(" ");
}
//#endregion
export { assigneeLabel as n, AssigneePicker as t };
