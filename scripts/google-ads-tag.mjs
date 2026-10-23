/** Official Google Ads tag. One copy, inserted immediately after `<head>`. */
export const GOOGLE_ADS_TAG_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18531899573"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18531899573');
</script>`;

/**
 * Insert the tag once, immediately after the opening head tag.
 * Holds a short tail so a head tag split across chunks is still found.
 */
export function createGoogleAdsTagInserter() {
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
      if (after.startsWith(GOOGLE_ADS_TAG_SNIPPET)) return text;
      return text.slice(0, end + 1) + GOOGLE_ADS_TAG_SNIPPET + after;
    },
    flush() {
      const rest = pending;
      pending = "";
      done = true;
      return rest;
    },
  };
}
