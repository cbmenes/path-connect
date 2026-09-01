//#region node_modules/.nitro/vite/services/ssr/assets/card-utils-DAZ5YeNe.js
/** Client-safe card helpers. Full PANs are never stored. */
function luhnOk(num) {
	const digits = num.replace(/\D/g, "");
	if (digits.length < 13 || digits.length > 19) return false;
	let sum = 0;
	let alt = false;
	for (let i = digits.length - 1; i >= 0; i--) {
		let n = Number(digits[i]);
		if (alt) {
			n *= 2;
			if (n > 9) n -= 9;
		}
		sum += n;
		alt = !alt;
	}
	return sum % 10 === 0;
}
function detectBrand(num) {
	const d = num.replace(/\D/g, "");
	if (/^4/.test(d)) return "visa";
	if (/^3[47]/.test(d)) return "amex";
	if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "mastercard";
	if (/^6(?:011|5)/.test(d)) return "discover";
	return "card";
}
function formatCardNumber(raw) {
	return raw.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function brandLabel(brand) {
	return {
		visa: "Visa",
		mastercard: "Mastercard",
		amex: "American Express",
		discover: "Discover",
		card: "Card"
	}[brand] ?? brand;
}
var TEST_SUCCESS = "4242424242424242";
var TEST_DECLINE = "4000000000000002";
//#endregion
export { formatCardNumber as a, detectBrand as i, TEST_SUCCESS as n, luhnOk as o, brandLabel as r, TEST_DECLINE as t };
