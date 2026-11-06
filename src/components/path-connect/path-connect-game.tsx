import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Lightbulb, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
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
import { themeById, type ThemeId } from "@/lib/path-connect/styles";
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
  const [motionOn, setMotionOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const boardRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<Point[]>([]);
  const theme = themeById(level.theme);
  const lastLevel = levelId === LEVELS.length;
  const linked = linkedIndexes(level, spins);
  const network = reachTargets(boardCells(level, spins));
  const fed = new Set(network.reached);
  const charged = new Set(network.paths.flat());
  const nodeTotal = level.tiles.filter((tile) => tile.role === "end").length;
  const nodeWord = nodeTotal === 1 ? theme.node : theme.nodePlural;
  const meter = nodeTotal === 0 ? 0 : Math.round((fed.size / nodeTotal) * 100);

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
    <div className="path-connect min-h-dvh" data-style="cozy" data-theme={theme.id}>
      <Corner theme={theme.id} />
      <main className="pc-shell" data-phase={phase} data-level={levelId} data-mode={mode}>
        <header className="pc-head">
          <div className="pc-brand">
            <ThemeMark theme={theme.id} />
            <div>
              <h1>Path Connect</h1>
              <p className="pc-theme-name">{theme.title}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pc-mute ml-auto border-0 bg-transparent text-pc-accent hover:bg-transparent hover:text-pc-fg"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          </div>
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
        </header>

        <section className="pc-level">
          <div className="pc-meter" aria-label={`${fed.size} of ${nodeTotal} ${nodeWord} connected`}>
            <NodeGlyph theme={theme.id} on={fed.size > 0} />
            <span className="pc-meter-track">
              <span className="pc-meter-fill" style={{ width: `${meter}%` }} />
            </span>
            <span className="pc-meter-count tabular">
              {fed.size} / {nodeTotal}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
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
            <p className="tabular shrink-0 text-right text-sm font-semibold text-pc-accent">
              {mode === "daily" ? (
                <span className="pc-timer" data-low={secondsLeft <= 15 && phase === "play"}>
                  {formatClock(secondsLeft)}
                </span>
              ) : (
                <>
                  {levelId}
                  <span className="text-pc-muted"> / {LEVELS.length}</span>
                </>
              )}
              <span className="mt-1 block text-xs font-medium text-pc-muted">
                {moves} {moves === 1 ? "turn" : "turns"}
              </span>
            </p>
          </div>
        </section>

        <div className="pc-scene pc-board-wrap" data-room={theme.id}>
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
                    : `Turn pipe, ${place}`;
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
                    <span className="pc-mark pc-source">
                      <SourceGlyph theme={theme.id} />
                    </span>
                  )}
                  {tile.role === "end" && (
                    <span className={powered ? "pc-mark pc-plant is-fed" : "pc-mark pc-plant"}>
                      <NodeGlyph theme={theme.id} on={powered || order >= 0} />
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
            {phase === "won" && (
              <>
                <span className="pc-flash" aria-hidden="true" />
                <span className="pc-flash pc-flash-late" aria-hidden="true" />
              </>
            )}
          </div>
          </div>
        </div>

        <p className="pc-status pc-tip text-sm text-pretty" aria-live="polite">
          <NodeGlyph theme={theme.id} on={phase === "won" || phase === "flow"} />
          <span>
          {phase === "won" ? (
            <>
              <span className="block text-base font-semibold tracking-tight text-pc-flow">
                {mode === "daily" ? "Challenge complete" : "Level complete"}
              </span>
              <span className="text-pc-muted">{status}</span>
            </>
          ) : (
            <span className="text-pc-muted">{status ?? theme.rule}</span>
          )}
          </span>
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

      </main>
    </div>
  );
}

function Corner({ theme }: { theme: ThemeId }) {
  return (
    <div className="pc-corner" aria-hidden="true">
      {theme === "alarm" ? <BuildingArt /> : theme === "fire" ? <SchoolArt /> : <HouseArt />}
    </div>
  );
}

function ThemeMark({ theme }: { theme: ThemeId }) {
  if (theme === "alarm") return <BuildingArt small />;
  if (theme === "fire") return <SchoolArt small />;
  return <HouseArt small />;
}

function SourceGlyph({ theme }: { theme: ThemeId }) {
  return <ThemeMark theme={theme} />;
}

function NodeGlyph({ theme, on }: { theme: ThemeId; on: boolean }) {
  if (theme === "alarm") return <Sensor on={on} />;
  if (theme === "fire") return <Strobe on={on} />;
  return <Bulb on={on} />;
}

function Bulb({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 48 58" className={on ? "pc-glyph is-on" : "pc-glyph"}>
      <path
        d="M24 2.5c-10.2 0-16.5 8.2-16.5 17.6 0 6.4 3.5 10.8 6.6 13.8 1.2 1.2 2.1 2.9 2.1 4.8V42h15.6v-3.3c0-1.9.9-3.6 2.1-4.8 3.1-3 6.6-7.4 6.6-13.8C40.5 10.7 34.2 2.5 24 2.5z"
        fill={on ? "var(--color-pc-glass-on)" : "var(--color-pc-glass)"}
        stroke="var(--color-pc-glass-ink)"
        strokeWidth="2.6"
      />
      <path
        d="M24 9c-4.4 4.8-3.4 9.4 0 14 4.4-4.6 5.4-9.2 0-14z"
        fill="white"
        opacity={on ? 0.95 : 0.55}
      />
      <rect x="15" y="42.5" width="18" height="4.2" rx="1.2" fill="var(--color-pc-glass-ink)" />
      <rect x="16.5" y="47.4" width="15" height="3.2" rx="1" fill="var(--color-pc-casing)" />
      <rect x="18" y="51.4" width="12" height="3" rx="1" fill="var(--color-pc-glass-ink)" />
    </svg>
  );
}

function Sensor({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 48 56" className={on ? "pc-glyph is-on" : "pc-glyph"}>
      <rect x="6" y="10" width="36" height="34" rx="10" fill="var(--color-pc-glass-ink)" />
      <rect x="9" y="13" width="30" height="28" rx="8" fill="var(--color-pc-glass)" />
      <circle cx="24" cy="27" r="9" fill="var(--color-pc-glass-ink)" />
      <circle cx="24" cy="27" r="6.2" fill={on ? "var(--color-pc-glass-on)" : "white"} />
      {on && <circle cx="21.5" cy="24.6" r="2" fill="white" />}
    </svg>
  );
}

function Strobe({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 48 56" className={on ? "pc-glyph is-on" : "pc-glyph"}>
      <rect x="5" y="8" width="38" height="40" rx="8" fill="var(--color-pc-glass-ink)" />
      <rect x="8" y="11" width="32" height="34" rx="6" fill="var(--color-pc-casing)" />
      <rect
        x="13"
        y="16"
        width="22"
        height="18"
        rx="4"
        fill={on ? "var(--color-pc-glass-on)" : "var(--color-pc-glass)"}
        stroke="var(--color-pc-glass-ink)"
        strokeWidth="2"
      />
      <path
        d="M17 21h14M17 25h14M17 29h14"
        stroke="var(--color-pc-glass-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={on ? 0.28 : 0.75}
      />
      <rect x="16" y="38" width="16" height="3.2" rx="1" fill="var(--color-pc-glass-ink)" />
    </svg>
  );
}

function HouseArt({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 80 72" className={small ? "pc-mark-icon" : "pc-corner-art"}>
      <path d="M8 34 40 8l32 26v30a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V34z" fill="#f4d7b0" />
      <path d="M4 36 40 4l36 32" fill="none" stroke="#c47a45" strokeWidth="6" strokeLinejoin="round" />
      <rect x="33" y="40" width="14" height="22" rx="2" fill="#a86a3a" />
      <rect x="18" y="40" width="10" height="10" rx="1.5" fill="#ffe7a3" />
      <rect x="52" y="40" width="10" height="10" rx="1.5" fill="#ffe7a3" />
    </svg>
  );
}

function BuildingArt({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 80 72" className={small ? "pc-mark-icon" : "pc-corner-art"}>
      <rect x="16" y="16" width="48" height="50" rx="4" fill="#d5e6f4" />
      <rect x="24" y="24" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="36" y="24" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="48" y="24" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="24" y="38" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="36" y="38" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="48" y="38" width="8" height="8" rx="1" fill="#7ec8ea" />
      <rect x="34" y="50" width="12" height="16" rx="1" fill="#4f86b0" />
    </svg>
  );
}

function SchoolArt({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 80 72" className={small ? "pc-mark-icon" : "pc-corner-art"}>
      <path d="M8 36 40 14l32 22v28H8V36z" fill="#f6d2c8" />
      <path d="M6 38 40 12l34 26" fill="none" stroke="#d4655a" strokeWidth="6" strokeLinejoin="round" />
      <rect x="34" y="40" width="12" height="20" rx="1" fill="#c4544c" />
      <circle cx="40" cy="22" r="4" fill="#ffd56a" />
    </svg>
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
