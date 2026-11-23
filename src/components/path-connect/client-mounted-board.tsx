import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Web and iOS render the board in place, so their prerendered HTML hydrates.
 * Android skips hydration for this tree: the first paint is only an anchor,
 * and the board element is created and inserted after mount.
 */
export function ClientMountedBoard({
  mountAfterPaint,
  boardRef,
  label,
  cols,
  children,
}: {
  mountAfterPaint: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
  label: string;
  cols: number;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountAfterPaint) return;
    const tray = anchorRef.current?.parentElement;
    if (!tray) return;
    const board = document.createElement("div");
    board.className = "pc-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", label);
    board.style.setProperty("--pc-cols", String(cols));
    tray.insertBefore(board, anchorRef.current);
    boardRef.current = board;
    setHost(board);
    return () => {
      board.remove();
      if (boardRef.current === board) boardRef.current = null;
      setHost(null);
    };
  }, [mountAfterPaint, boardRef, label, cols]);

  if (!mountAfterPaint) {
    return (
      <div
        ref={boardRef}
        className="pc-board"
        role="group"
        aria-label={label}
        style={{ "--pc-cols": cols } as CSSProperties}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <span ref={anchorRef} data-pc-board-anchor="" hidden />
      {host ? createPortal(children, host) : null}
    </>
  );
}
