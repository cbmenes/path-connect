import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-2pyTGW3_.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function initials(name) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
//#endregion
export { initials as n, cn as t };
