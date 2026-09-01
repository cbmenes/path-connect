//#region node_modules/.nitro/vite/services/ssr/assets/time-DJsHuhyu.js
var TZ = "America/Chicago";
function pad(n) {
	return String(n).padStart(2, "0");
}
/** Build a Date for a civil time in America/Chicago. */
function chicagoDate(y, month, day, hour = 0, minute = 0) {
	for (const off of ["-05:00", "-06:00"]) {
		const iso = `${y}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${off}`;
		const dt = new Date(iso);
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone: TZ,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23"
		}).formatToParts(dt);
		const get = (t) => Number(parts.find((p) => p.type === t)?.value);
		if (get("year") === y && get("month") === month && get("day") === day && get("hour") === hour && get("minute") === minute) return dt;
	}
	return /* @__PURE__ */ new Date(`${y}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-05:00`);
}
function partsInChicago(date) {
	const d = typeof date === "string" ? new Date(date) : date;
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).formatToParts(d);
	const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
	return {
		year: Number(get("year")),
		month: Number(get("month")),
		day: Number(get("day")),
		weekday: get("weekday"),
		hour: Number(get("hour")),
		minute: Number(get("minute"))
	};
}
function formatDate(date, opts) {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("en-US", {
		timeZone: TZ,
		month: "short",
		day: "numeric",
		...opts
	}).format(d);
}
function formatTime(date) {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("en-US", {
		timeZone: TZ,
		hour: "numeric",
		minute: "2-digit"
	}).format(d);
}
function formatDateTime(date) {
	return `${formatDate(date, {
		weekday: "short",
		month: "short",
		day: "numeric"
	})} · ${formatTime(date)}`;
}
function toDatetimeLocalValue(date) {
	const p = partsInChicago(date);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
function fromDatetimeLocalValue(value) {
	const [date, time] = value.split("T");
	const [y, m, d] = date.split("-").map(Number);
	const [h, min] = (time || "09:00").split(":").map(Number);
	return chicagoDate(y, m, d, h, min);
}
function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 6e4);
}
function hoursUntil(date) {
	return ((typeof date === "string" ? new Date(date) : date).getTime() - Date.now()) / 36e5;
}
function startOfChicagoDay(date) {
	const p = partsInChicago(date);
	return chicagoDate(p.year, p.month, p.day, 0, 0);
}
function addDaysChicago(date, days) {
	const p = partsInChicago(date);
	const utc = Date.UTC(p.year, p.month - 1, p.day + days);
	const nd = new Date(utc);
	return chicagoDate(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), 0, 0);
}
var WEEKDAY_INDEX = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6
};
function nextWeekdayOnOrAfter(from, weekday, hour, minute) {
	const want = WEEKDAY_INDEX[weekday.toLowerCase()] ?? 1;
	for (let i = 0; i < 8; i++) {
		const p = partsInChicago(addDaysChicago(from, i));
		if (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() === want) return chicagoDate(p.year, p.month, p.day, hour, minute);
	}
	return from;
}
function money(cents) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format((cents || 0) / 100);
}
function nid(prefix) {
	const id = crypto.randomUUID();
	return prefix ? `${prefix}_${id}` : id;
}
function minutesToHours(min) {
	return Math.round(Number(min) / 60 * 2) / 2;
}
function hoursToMinutes(hours) {
	const n = Number(hours);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.round(n * 60);
}
function formatHours(min) {
	const h = minutesToHours(min);
	return `${Number.isInteger(h) ? String(h) : h.toFixed(1)} hr`;
}
function sameChicagoDay(a, b) {
	const pa = partsInChicago(a);
	const pb = partsInChicago(b);
	return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}
function startOfChicagoWeek(d) {
	const start = startOfChicagoDay(d);
	const p = partsInChicago(start);
	const utc = Date.UTC(p.year, p.month - 1, p.day);
	return addDaysChicago(start, -new Date(utc).getUTCDay());
}
function startOfChicagoMonth(d) {
	const p = partsInChicago(d);
	return chicagoDate(p.year, p.month, 1, 0, 0);
}
//#endregion
export { startOfChicagoDay as _, formatDateTime as a, toDatetimeLocalValue as b, fromDatetimeLocalValue as c, minutesToHours as d, money as f, sameChicagoDay as g, partsInChicago as h, formatDate as i, hoursToMinutes as l, nid as m, addMinutes as n, formatHours as o, nextWeekdayOnOrAfter as p, chicagoDate as r, formatTime as s, addDaysChicago as t, hoursUntil as u, startOfChicagoMonth as v, startOfChicagoWeek as y };
