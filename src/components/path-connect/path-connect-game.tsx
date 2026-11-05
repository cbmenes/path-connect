import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  Flame,
  Lamp,
  Lightbulb,
  Shield,
  Siren,
  Zap,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DAILY_SECONDS,
  dailyLevel,
  dateKey,
  formatClock,
  formatDailyDate,
  isBetterScore,
  readBest,
  writeBest,
  type DailyScore,
} from "@/lib/path-connect/daily";
import { LEVELS, boardCells, type Level } from "@/lib/path-connect/levels";
import {
  DIRS,
  GRID_SIZE,
  cellMask,
  findMisrotatedIndex,
  openingIds,
  reachTargets,
  rowCol,
} from "@/lib/path-connect/logic";
import { playTurn, playWin } from "@/lib/path-connect/sound";
import { DEFAULT_THEME, THEMES, themeById, type ThemeId } from "@/lib/path-connect/styles";
import { TileArt } from "@/components/path-connect/tile-art";

type Phase = "play" | "flow" | "won" | "expired";
type PlayMode = "levels" | "daily";

interface CampaignSnap {
  levelId: number;
  spins: number[];
  moves: number;
  phase: Phase;
  flowPath: number[] | null;
  flowPaths: number[][] | null;
  note: string | null;
}

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

const MARKS: Record<ThemeId, { source: LucideIcon; node: LucideIcon }> = {
  lights: { source: Zap, node: Lamp },
  alarm: { source: Shield, node: Bell },
  fire: { source: Flame, node: Siren },
};

/**
 * Rotate every tile, including the panel and the nodes, until each node is
 * powered. Hint and undo stay as notes: they do not change the board yet.
 */
export function PathConnectGame() {
  const [mode, setMode] = useState<PlayMode>("levels");
  const [levelId, setLevelId] = useState(1);
  const daily = useMemo(() => dailyLevel(new Date()), []);
  const todayKey = dateKey(new Date());
  const level = mode === "daily" ? daily : (LEVELS[levelId - 1] ?? LEVELS[0]!);
  const [spins, setSpins] = useState<number[]>(() => level.tiles.map((tile) => tile.initial));
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const [secondsLeft, setSecondsLeft] = useState(DAILY_SECONDS);
  const [best, setBest] = useState<DailyScore | null>(null);
  const [result, setResult] = useState<DailyScore | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const spinsRef = useRef(spins);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const movesRef = useRef(moves);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const deadlineRef = useRef(0);
  const campaignRef = useRef<CampaignSnap | null>(null);
  const [flowPath, setFlowPath] = useState<number[] | null>(null);
  const [flowPaths, setFlowPaths] = useState<number[][] | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
  const [motionOn, setMotionOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const boardRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<Point[]>([]);
  const theme = themeById(themeId);
  const marks = MARKS[theme.id];
  const lastLevel = levelId === LEVELS.length;
  const linked = linkedIndexes(level, spins);
  const network = reachTargets(boardCells(level, spins));
  const fed = new Set(network.reached);
  const charged = new Set(network.paths.flat());
  const nodeTotal = level.tiles.filter((tile) => tile.role === "end").length;
  const nodeWord = nodeTotal === 1 ? theme.node : theme.nodePlural;

  useEffect(() => {
    setThemeId(level.theme);
  }, [level.id, level.theme, mode]);

  useEffect(() => {
    setBest(readBest(todayKey));
  }, [todayKey]);

  useEffect(() => {
    if (mode !== "daily" || phase !== "play") return;
    const tick = () => {
      if (phaseRef.current !== "play") return;
      const left = Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && phaseRef.current === "play") {
        phaseRef.current = "expired";
        setPhase("expired");
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [mode, phase]);

  useEffect(() => {
    const paths = (flowPaths ?? []).filter((path) => path.length > 1);
    if (phase !== "flow" || paths.length === 0) return;
    let frame = 0;
    let cancelled = false;
    centersRef.current = measureCenters(boardRef.current);

    if (prefersReducedMotion()) {
      setCharge(null);
      setPhase("won");
      playWin(mutedRef.current);
      return;
    }

    const started = performance.now();
    const spans = paths.map((path) => path.length - 1);
    const total = spans.reduce((sum, span) => sum + span, 0);
    const duration = Math.max(640, total * 90);
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - started) / duration);
      const eased = t * t * (3 - 2 * t);
      let remain = eased * total;
      let path = paths[0]!;
      for (let index = 0; index < paths.length; index++) {
        const span = spans[index]!;
        path = paths[index]!;
        if (remain <= span || index === paths.length - 1) break;
        remain -= span;
      }
      const step = Math.min(path.length - 2, Math.floor(remain));
      const along = Math.min(1, remain - step);
      const live = centersRef.current;
      const from = live[path[step]!];
      const to = live[path[step + 1]!];
      if (from && to) {
        const head = {
          x: from.x + (to.x - from.x) * along,
          y: from.y + (to.y - from.y) * along,
        };
        setCharge((prev) => ({
          head,
          trail: prev
            ? [prev.head, ...prev.trail].slice(0, 22)
            : [],
        }));
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        setCharge(null);
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
  }, [phase, flowPaths]);

  function loadBoard(next: Level, nextId?: number) {
    const initial = next.tiles.map((tile) => tile.initial);
    spinsRef.current = initial;
    movesRef.current = 0;
    phaseRef.current = "play";
    setMotionOn(false);
    if (nextId !== undefined) setLevelId(nextId);
    setSpins(initial);
    setMoves(0);
    setPhase("play");
    setFlowPath(null);
    setFlowPaths(null);
    setCharge(null);
    setNote(null);
    setResult(null);
    setIsNewBest(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotionOn(true));
    });
  }

  function reset(nextId: number) {
    const next = LEVELS[nextId - 1];
    if (!next) return;
    loadBoard(next, nextId);
  }

  function startDaily() {
    deadlineRef.current = performance.now() + DAILY_SECONDS * 1000;
    setSecondsLeft(DAILY_SECONDS);
    loadBoard(daily);
  }

  function switchMode(next: PlayMode) {
    if (next === mode) return;
    if (next === "daily") {
      campaignRef.current = {
        levelId,
        spins: spinsRef.current,
        moves: movesRef.current,
        phase: phaseRef.current,
        flowPath,
        flowPaths,
        note,
      };
      setMode("daily");
      startDaily();
      return;
    }
    const snap = campaignRef.current;
    setMode("levels");
    if (!snap) {
      reset(levelId);
      return;
    }
    spinsRef.current = snap.spins;
    movesRef.current = snap.moves;
    phaseRef.current = snap.phase === "expired" ? "play" : snap.phase;
    setLevelId(snap.levelId);
    setSpins(snap.spins);
    setMoves(snap.moves);
    setPhase(phaseRef.current);
    setFlowPath(snap.flowPath);
    setFlowPaths(snap.flowPaths);
    setCharge(null);
    setNote(snap.note);
    setResult(null);
    setIsNewBest(false);
  }

  function onRotate(index: number) {
    const tile = level.tiles[index];
    // phaseRef updates in the same click, so a second tap cannot undo a win
    // before React re-renders. spinsRef does the same for quick quarter-turns.
    if (!tile || phaseRef.current !== "play") return;
    if (modeRef.current === "daily" && performance.now() >= deadlineRef.current) {
      phaseRef.current = "expired";
      setPhase("expired");
      return;
    }
    const nextSpins = spinsRef.current.map((spin, i) => (i === index ? spin + 1 : spin));
    spinsRef.current = nextSpins;
    movesRef.current += 1;
    setSpins(nextSpins);
    setMoves(movesRef.current);
    setNote(null);
    playTurn(mutedRef.current);
    const network = reachTargets(boardCells(level, nextSpins));
    if (!network.complete) return;
    if (modeRef.current === "daily") {
      const secondsLeftNow = Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000));
      const score = { secondsLeft: secondsLeftNow, turns: movesRef.current };
      setSecondsLeft(secondsLeftNow);
      setResult(score);
      const stored = readBest(todayKey);
      if (isBetterScore(score, stored)) {
        writeBest(todayKey, score);
        setBest(score);
        setIsNewBest(true);
      } else {
        setIsNewBest(false);
      }
    }
    setFlowPaths(network.paths);
    setFlowPath(spreadOrder(network.paths));
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
    phase === "expired"
      ? "Time's up. Retry uses the same board."
      : phase === "won"
        ? mode === "daily" && result
          ? `${isNewBest ? "New best. " : ""}Finished with ${formatClock(result.secondsLeft)} left in ${result.turns} ${result.turns === 1 ? "turn" : "turns"}.`
          : `${lastLevel ? "That was the last board. " : ""}${theme.complete}`
        : phase === "flow"
          ? theme.live
          : note;

  return (
    <div className="path-connect min-h-dvh" data-style="wires" data-theme={theme.id}>
      <main className="pc-shell" data-phase={phase} data-level={levelId} data-mode={mode}>
        <header className="pc-head flex items-start justify-between gap-3">
          <div>
            <p className="pc-kicker">{theme.kicker}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Path Connect</h1>
            <p className="mt-1 max-w-xs text-sm text-pc-muted text-pretty">{theme.rule}</p>
            <div className="pc-styles pc-modes" role="group" aria-label="Play mode">
              <button
                type="button"
                aria-pressed={mode === "levels"}
                className={mode === "levels" ? "is-on" : undefined}
                onClick={() => switchMode("levels")}
              >
                Levels
              </button>
              <button
                type="button"
                aria-pressed={mode === "daily"}
                className={mode === "daily" ? "is-on" : undefined}
                onClick={() => switchMode("daily")}
              >
                Daily
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === "daily" ? (
              <p
                className="pc-timer tabular whitespace-nowrap text-sm font-semibold"
                data-low={secondsLeft <= 15 && phase === "play"}
                aria-live="polite"
              >
                {formatClock(secondsLeft)}
              </p>
            ) : (
              <p className="tabular whitespace-nowrap text-sm font-medium text-pc-fg">
                {levelId}
                <span className="text-pc-muted"> / {LEVELS.length}</span>
              </p>
            )}
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
            <h2 className="text-lg font-semibold tracking-tight">
              {mode === "daily" ? `Daily · ${formatDailyDate(new Date())} UTC` : level.name}
            </h2>
            <p className="text-sm text-pc-muted text-pretty">{level.blurb}</p>
            {mode === "daily" && (
              <p className="pc-best mt-1 text-sm text-pc-fg">
                {best
                  ? `Best today: ${formatClock(best.secondsLeft)} left · ${best.turns} ${best.turns === 1 ? "turn" : "turns"}`
                  : "Best today: not set"}
              </p>
            )}
          </div>
          <p className="tabular shrink-0 text-right text-sm text-pc-muted">
            <span className="block font-medium text-pc-fg">
              {fed.size}/{nodeTotal} {nodeWord} connected
            </span>
            {moves} {moves === 1 ? "turn" : "turns"}
          </p>
        </section>

        <div className="pc-scene pc-board-wrap">
          <div className="pc-tray">
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
              const locked = phase !== "play";
              const powered = tile.role === "end" && fed.has(index);
              const hot = charged.has(index);
              const order = flowPath ? flowPath.indexOf(index) : -1;
              const openings = openingIds(
                cellMask({ kind: tile.kind, rotation, role: tile.role }),
              ).join("");
              const place = `row ${row + 1}, column ${col + 1}`;
              const label =
                tile.role === "start"
                  ? `Turn ${theme.source}, ${place}`
                  : tile.role === "end"
                    ? `${powered ? "Powered" : "Turn"} ${theme.node}, ${place}`
                    : `Turn wire, ${place}`;
              return (
                <button
                  key={`${level.id}-${index}`}
                  type="button"
                  className="pc-tile"
                  data-index={index}
                  data-role={tile.role}
                  data-openings={openings}
                  data-linked={linked.has(index)}
                  data-charged={hot}
                  data-fed={powered}
                  data-live={order >= 0}
                  aria-disabled={locked}
                  aria-label={label}
                  style={{ "--delay": order >= 0 ? `${order * 180}ms` : "0ms" } as CSSProperties}
                  onClick={() => onRotate(index)}
                >
                  <span className="pc-depth">
                    <span
                      className={motionOn ? "pc-spin" : "pc-spin pc-spin-off"}
                      style={{ transform: `rotate(${spin * 90}deg)` }}
                    >
                      <TileArt
                        kind={tile.kind}
                        conduit={theme.conduit}
                        live={order >= 0 || hot}
                        hub={tile.role === "start" ? "start" : tile.role === "end" ? "end" : "plain"}
                      />
                    </span>
                  </span>
                  {tile.role === "start" && (
                    <span className="pc-mark text-pc-onstart">
                      <marks.source className="size-4" strokeWidth={2.5} />
                    </span>
                  )}
                  {tile.role === "end" && (
                    <span className={powered ? "pc-mark pc-plant is-fed" : "pc-mark pc-plant"}>
                      <marks.node className="size-5" strokeWidth={2.25} />
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
                      opacity: Math.max(0.15, 0.85 - index * 0.05),
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
            {phase === "won" && <span className="pc-flash" aria-hidden="true" />}
          </div>
          </div>
        </div>

        <div className="pc-legend flex items-center gap-4 text-sm text-pc-muted">
          <span className="inline-flex items-center gap-2">
            <span className="pc-swatch pc-swatch-start" />
            {theme.source}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="pc-swatch pc-swatch-end" />
            {theme.nodePlural}
          </span>
        </div>

        <p className="pc-status text-sm text-pretty" aria-live="polite">
          {phase === "won" ? (
            <>
              <span className="block text-base font-semibold tracking-tight text-pc-flow">
                {mode === "daily" ? "Challenge complete" : "Level complete"}
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
            onClick={() => (mode === "daily" ? startDaily() : reset(levelId))}
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
          {phase === "won" && mode === "levels" && (
            <Button
              type="button"
              className="col-span-3 bg-pc-flow text-pc-onflow hover:bg-pc-flow/90"
              onClick={() => reset(lastLevel ? 1 : levelId + 1)}
            >
              {lastLevel ? "Play again" : "Next level"}
              <ArrowRight />
            </Button>
          )}
          {(phase === "won" || phase === "expired") && mode === "daily" && (
            <Button
              type="button"
              className="col-span-3 bg-pc-flow text-pc-onflow hover:bg-pc-flow/90"
              onClick={startDaily}
            >
              {phase === "expired" ? "Retry" : "Try again"}
              <ArrowRight />
            </Button>
          )}
        </div>

        <div className="pc-style-row flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-pc-muted">System</p>
          <div className="pc-styles" role="group" aria-label="Electrical system">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === themeId}
                aria-label={item.title}
                className={item.id === themeId ? "is-on" : undefined}
                onClick={() => setThemeId(item.id)}
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

function spreadOrder(paths: readonly (readonly number[])[]): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const longest = Math.max(0, ...paths.map((path) => path.length));
  for (let step = 0; step < longest; step++) {
    for (const path of paths) {
      const cell = path[step];
      if (cell === undefined || seen.has(cell)) continue;
      seen.add(cell);
      order.push(cell);
    }
  }
  return order;
}

function linkedIndexes(
  level: (typeof LEVELS)[number],
  spins: readonly number[],
): Set<number> {
  const cells = boardCells(level, spins);
  const linked = new Set<number>();
  cells.forEach((cell, index) => {
    const mask = cellMask(cell);
    const { row, col } = rowCol(index);
    for (const dir of DIRS) {
      if ((mask & dir.bit) === 0) continue;
      const nextRow = row + dir.dr;
      const nextCol = col + dir.dc;
      if (nextRow < 0 || nextCol < 0 || nextRow >= GRID_SIZE || nextCol >= GRID_SIZE) continue;
      const neighbor = nextRow * GRID_SIZE + nextCol;
      const neighborMask = cellMask(cells[neighbor]!);
      if ((neighborMask & dir.opposite) === 0) continue;
      linked.add(index);
      linked.add(neighbor);
    }
  });
  return linked;
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
