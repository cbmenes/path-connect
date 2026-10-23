/** Official Google Ads tag. One copy, inserted immediately after `<head>`. */
export const GOOGLE_ADS_TAG_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18531899573"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18531899573');
</script>`;

/** Purchase conversion. Only the /welcome success page. */
export const GOOGLE_ADS_PURCHASE_SNIPPET = `<!-- Event snippet for Purchase (1) conversion page -->
<script>
  gtag('event', 'conversion', {
    'send_to': 'AW-18531899573/L_DCOmYlacdELWx2YRF',
    'transaction_id': '',
    // 'new_customer': true /* calculate dynamically, populate with true/false */,
  });
</script>`;

const PURCHASE_SEND_TO = "AW-18531899573/L_DCOmYlacdELWx2YRF";

/**
 * Insert the tag once, immediately after the opening head tag.
 * On the purchase success page, the event snippet follows that tag.
 * Holds a short tail so a head tag split across chunks is still found.
 * @param {{ purchase?: boolean }} [options]
 */
export function createGoogleAdsTagInserter(options = {}) {
  const purchase = options.purchase === true;
  let pending = "";
  let done = false;

  return {
    /** @param {string} chunk */
    push(chunk) {
      const text = pending + chunk;
      pending = "";
      if (done) return text;

      const start = text.indexOf("<head");
      if (start === -1) {
        if (text.length > 32) {
          pending = text.slice(-32);
          return text.slice(0, -32);
        }
        pending = text;
        return "";
      }

      const end = text.indexOf(">", start);
      if (end === -1) {
        pending = text;
        return "";
      }

      done = true;
      const after = text.slice(end + 1);
      const headEnd = end + 1;
      if (after.startsWith(GOOGLE_ADS_TAG_SNIPPET)) {
        if (!purchase || after.includes(PURCHASE_SEND_TO)) return text;
        const eventAt = headEnd + GOOGLE_ADS_TAG_SNIPPET.length;
        return text.slice(0, eventAt) + "\n" + GOOGLE_ADS_PURCHASE_SNIPPET + text.slice(eventAt);
      }
      const block = purchase
        ? `${GOOGLE_ADS_TAG_SNIPPET}\n${GOOGLE_ADS_PURCHASE_SNIPPET}`
        : GOOGLE_ADS_TAG_SNIPPET;
      return text.slice(0, headEnd) + block + after;
    },
    flush() {
      const rest = pending;
      pending = "";
      done = true;
      return rest;
    },
  };
}
