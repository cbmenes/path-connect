/**
 * Capacitor iOS loads the page at `capacitor://localhost` and draws it under
 * the status bar. The website and the installed PWA stay on http(s), so they
 * keep the spacing they already have.
 */
export function applyNativeIosSafeArea(doc: Document, protocol: string): boolean {
  if (protocol !== "capacitor:") return false;
  const meta = doc.querySelector('meta[name="viewport"]');
  if (meta) {
    const content = meta.getAttribute("content") ?? "";
    if (!content.includes("viewport-fit")) {
      meta.setAttribute(
        "content",
        content ? `viewport-fit=cover, ${content}` : "viewport-fit=cover",
      );
    }
  }
  doc.documentElement.setAttribute("data-native", "ios");
  return true;
}

/** Runs in the document head, before the first paint, so the inset is in the first layout. */
export const nativeIosSafeAreaScript =
  '!function(){try{if(location.protocol!=="capacitor:")return;var m=document.querySelector(\'meta[name="viewport"]\');if(m){var c=m.getAttribute("content")||"";if(c.indexOf("viewport-fit")<0)m.setAttribute("content",c?"viewport-fit=cover, "+c:"viewport-fit=cover");}document.documentElement.setAttribute("data-native","ios");}catch(e){}}();';
