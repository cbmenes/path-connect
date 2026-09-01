/** Client-safe card helpers. Full PANs are never stored. */

export function luhnOk(num: string) {
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

export function detectBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^3[47]/.test(d)) return "amex";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "mastercard";
  if (/^6(?:011|5)/.test(d)) return "discover";
  return "card";
}

export function formatCardNumber(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function brandLabel(brand: string) {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    card: "Card",
  };
  return map[brand] ?? brand;
}

export const TEST_SUCCESS = "4242424242424242";
export const TEST_DECLINE = "4000000000000002";
