import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Droplet,
  Lightbulb,
  Zap,
  RotateCcw,
  Target,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVELS, boardCells } from "@/lib/path-connect/levels";
import {
  cellMask,
  findMisrotatedIndex,
  findPath,
  openingIds,
  rowCol,
} from "@/lib/path-connect/logic";
import { playTurn, playWin } from "@/lib/path-connect/sound";
import { DEFAULT_STYLE, STYLES, styleById, type StyleId } from "@/lib/path-connect/styles";
import { TileArt } from "@/components/path-connect/tile-art";

type Phase = "play" | "flow" | "won";

interface Point {
  x: number;
  y: number;
}

interface Charge {
  head: Point;
  trail: Point[];
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Rotate tiles until findPath reaches the outlet, then run the flow.
 * Hint and undo are placeholders: they log and explain themselves, and do
 * not change the board yet.
 */
export function PathConnectGame() {
  const [levelId, setLevelId] = useState(1);
  const level = LEVELS[levelId - 1] ?? LEVELS[0]!;
  const [spins, setSpins] = useState<number[]>(() => level.tiles.map((tile) => tile.initial));
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const spinsRef = useRef(spins);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [flowPath, setFlowPath] = useState<number[] | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<StyleId>(DEFAULT_STYLE);
  const [motionOn, setMotionOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const boardRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<Point[]>([]);
  const style = styleById(styleId);
  const lastLevel = levelId === LEVELS.length;

  useEffect(() => {
    if (phase !== "flow" || !flowPath || flowPath.length < 2) return;
    let frame = 0;
    let cancelled = false;
    const points = measureCenters(boardRef.current);
    centersRef.current = points;

    if (prefersReducedMotion()) {
      const end = points[flowPath[flowPath.length - 1]!];
      if (end) setCharge({ head: end, trail: [] });
      setPhase("won");
      playWin(mutedRef.current);
      return;
    }

    const started = performance.now();
    const span = Math.max(700, (flowPath.length - 1) * 240);
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - started) / span);
      const eased = t * t * (3 - 2 * t);
      const dist = eased * (flowPath.length - 1);
      const step = Math.min(flowPath.length - 2, Math.floor(dist));
      const along = dist - step;
      const live = centersRef.current;
      const from = live[flowPath[step]!];
      const to = live[flowPath[step + 1]!];
      if (from && to) {
        const head = {
          x: from.x + (to.x - from.x) * along,
          y: from.y + (to.y - from.y) * along,
        };
        setCharge((prev) => ({
          head,
          trail: prev ? [prev.head, ...prev.trail].slice(0, 6) : [],
        }));
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        setPhase("won");
        playWin(mutedRef.current);
      }
    };
    frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(() => {
      centersRef.current = measureCenters(boardRef.current);
    });
    if (boardRef.current) observer.observe(boardRef.current);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [phase, flowPath]);

  useEffect(() => {
    if (phase !== "won" || !flowPath || flowPath.length === 0) return;
    const place = () => {
      const end = measureCenters(boardRef.current)[flowPath[flowPath.length - 1]!];
      if (end) setCharge({ head: end, trail: [] });
    };
    place();
    const observer = new ResizeObserver(place);
    if (boardRef.current) observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, [phase, flowPath]);

  function reset(nextId: number) {
    const next = LEVELS[nextId - 1];
    if (!next) return;
    const initial = next.tiles.map((tile) => tile.initial);
    spinsRef.current = initial;
    phaseRef.current = "play";
    setMotionOn(false);
    setLevelId(nextId);
    setSpins(initial);
    setMoves(0);
    setPhase("play");
    setFlowPath(null);
    setCharge(null);
    setNote(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotionOn(true));
    });
  }

  function onRotate(index: number) {
    const tile = level.tiles[index];
    // phaseRef updates in the same click, so a second tap cannot undo a win
    // before React re-renders. spinsRef does the same for quick quarter-turns.
    if (!tile || phaseRef.current !== "play" || tile.role !== "play") return;
    const nextSpins = spinsRef.current.map((spin, i) => (i === index ? spin + 1 : spin));
    spinsRef.current = nextSpins;
    setSpins(nextSpins);
    setMoves((count) => count + 1);
    setNote(null);
    playTurn(mutedRef.current);
    const path = findPath(boardCells(level, nextSpins));
    if (!path) return;
    setFlowPath(path);
    if (prefersReducedMotion()) {
      phaseRef.current = "won";
      setPhase("won");
      playWin(mutedRef.current);
      return;
    }
    phaseRef.current = "flow";
    setPhase("flow");
  }

  function onHint() {
    const index = findMisrotatedIndex(
      level.tiles.map((tile, index) => ({
        ...tile,
        rotation: (((spins[index] ?? 0) % 4) + 4) % 4,
      })),
    );
    console.log("Hint: will highlight one tile that is not in the correct rotation.", index);
    setNote("Hint will highlight one tile that is not turned the right way yet.");
  }

  function onUndo() {
    console.log("Undo: will reverse the last rotation.");
    setNote("Undo will take back the last turn.");
  }

  const status =
    phase === "won"
      ? `${lastLevel ? "That was the last board. " : ""}${style.complete}`
      : phase === "flow"
        ? style.conduit === "trace"
          ? "The circuit is live."
          : "Connected. Watch it run."
        : note;

  return (
    <div className="path-connect min-h-dvh" data-style={styleId}>
      <main className="pc-shell" data-phase={phase} data-level={levelId}>
        <header className="pc-head flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Path Connect</h1>
            <p className="mt-1 max-w-xs text-sm text-pc-muted text-pretty">
              Turn a tile a quarter turn. A link counts only when both openings face each other.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="tabular whitespace-nowrap text-sm font-medium text-pc-fg">
              {levelId}
              <span className="text-pc-muted"> / {LEVELS.length}</span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="border border-pc-edge bg-pc-tile text-pc-fg hover:bg-pc-edge hover:text-pc-fg"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          </div>
        </header>

        <section className="pc-level flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{level.name}</h2>
            <p className="text-sm text-pc-muted text-pretty">{level.blurb}</p>
          </div>
          <p className="tabular shrink-0 text-sm text-pc-muted">
            {moves} {moves === 1 ? "turn" : "turns"}
          </p>
        </section>

        <div className="pc-tray pc-board-wrap">
          <div
            ref={boardRef}
            className="pc-board"
            role="group"
            aria-label={`Level ${levelId} board`}
          >
            {level.tiles.map((tile, index) => {
              const spin = spins[index] ?? tile.initial;
              const rotation = ((spin % 4) + 4) % 4;
              const { row, col } = rowCol(index);
              const locked = tile.role !== "play" || phase !== "play";
              const order = flowPath ? flowPath.indexOf(index) : -1;
              const openings = openingIds(
                cellMask({ kind: tile.kind, rotation, role: tile.role }),
              ).join("");
              const label =
                tile.role === "start"
                  ? `Source, row ${row + 1}, column ${col + 1}, fixed`
                  : tile.role === "end"
                    ? `Outlet, row ${row + 1}, column ${col + 1}, fixed`
                    : `Turn tile, row ${row + 1}, column ${col + 1}`;
              return (
                <button
                  key={`${level.id}-${index}`}
                  type="button"
                  className="pc-tile"
                  data-index={index}
                  data-role={tile.role}
                  data-openings={openings}
                  data-live={order >= 0}
                  aria-disabled={locked}
                  aria-label={label}
                  style={{ "--delay": order >= 0 ? `${order * 180}ms` : "0ms" } as CSSProperties}
                  onClick={() => onRotate(index)}
                >
                  <span
                    className={motionOn ? "pc-spin" : "pc-spin pc-spin-off"}
                    style={{ transform: `rotate(${spin * 90}deg)` }}
                  >
                    <TileArt
                      kind={tile.kind}
                      conduit={style.conduit}
                      live={order >= 0}
                      hub={tile.role === "start" ? "start" : tile.role === "end" ? "end" : "plain"}
                    />
                  </span>
                  {tile.role === "start" && (
                    <span className="pc-mark text-pc-onstart">
                      {style.conduit === "trace" ? (
                        <Zap className="size-4" strokeWidth={2.5} />
                      ) : (
                        <Droplet className="size-4" strokeWidth={2.5} />
                      )}
                    </span>
                  )}
                  {tile.role === "end" && (
                    <span className="pc-mark text-pc-flow">
                      <Target className="size-5" strokeWidth={2.25} />
                    </span>
                  )}
                </button>
              );
            })}
            {charge && phase !== "play" && (
              <>
                {charge.trail.map((point, index) => (
                  <span
                    key={index}
                    className="pc-bead pc-bead-trail"
                    style={{
                      transform: `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`,
                      opacity: Math.max(0.12, 0.55 - index * 0.08),
                    }}
                  />
                ))}
                <span
                  className="pc-bead"
                  style={{
                    transform: `translate(${charge.head.x}px, ${charge.head.y}px) translate(-50%, -50%)`,
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className="pc-legend flex items-center gap-4 text-sm text-pc-muted">
          <span className="inline-flex items-center gap-2">
            <span className="pc-swatch pc-swatch-start" />
            Source
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="pc-swatch pc-swatch-end" />
            Outlet
          </span>
        </div>

        <p className="pc-status text-sm text-pretty" aria-live="polite">
          {phase === "won" ? (
            <>
              <span className="block text-base font-semibold tracking-tight text-pc-flow">
                Level complete
              </span>
              <span className="text-pc-muted">{status}</span>
            </>
          ) : (
            <span className="text-pc-muted">{status}</span>
          )}
        </p>

        <div className="pc-actions grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-pc-edge bg-pc-tile px-2 text-pc-fg hover:bg-pc-edge hover:text-pc-fg"
            onClick={() => reset(levelId)}
          >
            <RotateCcw />
            Restart
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-pc-edge bg-pc-tile px-2 text-pc-fg hover:bg-pc-edge hover:text-pc-fg"
            onClick={onHint}
          >
            <Lightbulb />
            Hint
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-pc-edge bg-pc-tile px-2 text-pc-fg hover:bg-pc-edge hover:text-pc-fg"
            onClick={onUndo}
          >
            <Undo2 />
            Undo
          </Button>
          {phase === "won" && (
            <Button
              type="button"
              className="col-span-3 bg-pc-flow text-pc-onflow hover:bg-pc-flow/90"
              onClick={() => reset(lastLevel ? 1 : levelId + 1)}
            >
              {lastLevel ? "Play again" : "Next level"}
              <ArrowRight />
            </Button>
          )}
        </div>

        <div className="pc-style-row flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-pc-muted">Style</p>
          <div className="pc-styles" role="group" aria-label="Visual style">
            {STYLES.filter((item) => item.offered).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === styleId}
                className={item.id === styleId ? "is-on" : undefined}
                onClick={() => setStyleId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function measureCenters(board: HTMLDivElement | null): Point[] {
  if (!board) return [];
  const bounds = board.getBoundingClientRect();
  const points: Point[] = [];
  for (const node of board.querySelectorAll<HTMLElement>("[data-index]")) {
    const index = Number(node.dataset.index);
    const rect = node.getBoundingClientRect();
    points[index] = {
      x: rect.left - bounds.left + rect.width / 2,
      y: rect.top - bounds.top + rect.height / 2,
    };
  }
  return points;
}
