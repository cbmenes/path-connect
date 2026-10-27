import { useEffect, useRef, type ReactNode } from "react";

const HEADER_PX = 56;
const GAP_PX = 16;

/** Bring content that just opened into view, with space so a header does not cover it. */
export function scrollOpenedIntoView(el: HTMLElement) {
  const gap = GAP_PX;
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    const scrollable =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1;
    if (scrollable) {
      const elRect = el.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      const hidden = elRect.top < box.top + gap || elRect.bottom > box.bottom - 8;
      if (hidden) {
        node.scrollTo({
          top: Math.max(0, elRect.top - box.top + node.scrollTop - gap),
          behavior: motion(),
        });
      }
      return;
    }
    node = node.parentElement;
  }
  const rect = el.getBoundingClientRect();
  const limit = window.innerHeight - 8;
  const hidden = rect.top < HEADER_PX + gap || rect.bottom > limit || rect.top > limit;
  if (!hidden) return;
  window.scrollTo({
    top: Math.max(0, rect.top + window.scrollY - HEADER_PX - gap),
    behavior: motion(),
  });
}

function motion(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Mount only while the section is open. Closing unmounts it and does not scroll. */
export function OpenedContent({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (ref.current) scrollOpenedIntoView(ref.current);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <div ref={ref} className="scroll-mt-20">
      {children}
    </div>
  );
}
