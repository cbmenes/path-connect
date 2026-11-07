import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Lightbulb,
  Lock,
  RotateCcw,
  Timer,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_STATS,
  dailyLevel,
  dateKey,
  formatClock,
  formatDailyDate,
  readStats,
  recordFinish,
  untilNextDaily,
  writeStats,
  type DailyFinish,
  type DailyStats,
} from "@/lib/path-connect/daily";
import { CHAPTERS, LEVELS, boardCells, type Level } from "@/lib/path-connect/levels";
import {
  DIRS,
  cellMask,
  findMisrotatedIndex,
  openingIds,
  reachTargets,
  rowCol,
} from "@/lib/path-connect/logic";
import { readProgress, writeProgress, type Progress } from "@/lib/path-connect/progress";
import { playTurn, playWin } from "@/lib/path-connect/sound";
import { themeById, type ThemeId } from "@/lib/path-connect/styles";
import { Surroundings } from "@/components/path-connect/surroundings";
import { TileArt } from "@/components/path-connect/tile-art";

type Phase = "play" | "flow" | "won";
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
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState<DailyStats>(EMPTY_STATS);
  const [result, setResult] = useState<DailyFinish | null>(null);
  const spinsRef = useRef(spins);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const movesRef = useRef(moves);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const startedRef = useRef(0);
  const campaignRef = useRef<CampaignSnap | null>(null);
  const [flowPath, setFlowPath] = useState<number[] | null>(null);
  const [flowPaths, setFlowPaths] = useState<number[][] | null>(null);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [motionOn, setMotionOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState<Progress>({ level: 1, unlocked: 1 });
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nudged, setNudged] = useState<number | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const boardRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<Point[]>([]);
  const theme = themeById(level.theme);
  const lastLevel = levelId === LEVELS.length;
  const nextUnlock = lastLevel ? undefined : LEVELS[levelId]?.unlock;
  const linked = linkedIndexes(level, spins);
  const network = reachTargets(boardCells(level, spins));
  const fed = new Set(network.reached);
  const charged = new Set(network.paths.flat());
  const nodeTotal = level.tiles.filter((tile) => tile.role === "end").length;
  const nodeWord = nodeTotal === 1 ? theme.node : theme.nodePlural;
  const meter = nodeTotal === 0 ? 0 : Math.round((fed.size / nodeTotal) * 100);

  useEffect(() => {
    const saved = readStats();
    setStats(saved);
  }, []);

  useEffect(() => {
    const saved = readProgress(LEVELS.length);
    progressRef.current = saved;
    setProgress(saved);
    if (saved.level !== 1) reset(saved.level);
    // Read once after mount, so the server render and the first client render match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (nudged === null) return;
    const id = window.setTimeout(() => setNudged(null), 360);
    return () => window.clearTimeout(id);
  }, [nudged]);

  useEffect(() => {
    if (mode !== "daily" || phase !== "play") return;
    const tick = () => {
      if (phaseRef.current !== "play") return;
      setElapsed(Math.floor((performance.now() - startedRef.current) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 250);
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotionOn(true));
    });
  }

  function reset(nextId: number) {
    const next = LEVELS[nextId - 1];
    if (!next) return;
    loadBoard(next, nextId);
    saveProgress({ ...progressRef.current, level: nextId });
  }

  function saveProgress(next: Progress) {
    progressRef.current = next;
    setProgress(next);
    writeProgress(next);
  }

  function pickLevel(nextId: number) {
    setPickerOpen(false);
    if (nextId > progressRef.current.unlocked) return;
    reset(nextId);
  }

  function startDaily() {
    startedRef.current = performance.now();
    setElapsed(0);
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
    phaseRef.current = snap.phase;
    setLevelId(snap.levelId);
    setSpins(snap.spins);
    setMoves(snap.moves);
    setPhase(phaseRef.current);
    setFlowPath(snap.flowPath);
    setFlowPaths(snap.flowPaths);
    setCharge(null);
    setNote(snap.note);
    setResult(null);
  }

  function onRotate(index: number) {
    const tile = level.tiles[index];
    // phaseRef updates in the same click, so a second tap cannot undo a win
    // before React re-renders. spinsRef does the same for quick quarter-turns.
    if (!tile || phaseRef.current !== "play") return;
    if (tile.fixed) {
      setNudged(index);
      setNote("Bolted tiles stay put. Turn the tiles around them.");
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
      const seconds = Math.floor((performance.now() - startedRef.current) / 1000);
      const finish = recordFinish(readStats(), todayKey, { seconds, turns: movesRef.current });
      if (finish.counted) writeStats(finish.stats);
      setStats(finish.stats);
      setElapsed(seconds);
      setResult(finish);
    } else {
      const opened = Math.min(LEVELS.length, Math.max(progressRef.current.unlocked, levelId + 1));
      saveProgress({ level: levelId, unlocked: opened });
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

  const today = stats.days[todayKey];
  const status =
    phase === "won"
      ? mode === "daily" && result
        ? result.counted
          ? dailyCheer(result)
          : "Practice run. Bests count your first finish each day."
        : `${lastLevel ? "That was the last board. " : ""}${theme.complete}${nextUnlock ? ` Unlocked next: ${nextUnlock}.` : ""}`
      : phase === "flow"
        ? theme.live
        : (note ??
          (mode === "daily" && today
            ? `You finished today in ${formatClock(today.seconds)} with ${turnsLabel(today.turns)}. Replays are practice.`
            : null));

  return (
    <div className="path-connect min-h-dvh" data-style="cozy" data-theme={theme.id}>
      <main
        className="pc-shell"
        data-phase={phase}
        data-level={levelId}
        data-mode={mode}
        data-size={level.size}
      >
        <h1 className="sr-only">Path Connect · {theme.title}</h1>
        <header className="pc-top">
          <div className="pc-where">
            <ThemeMark theme={theme.id} />
            <div className="min-w-0">
              <h2 className="pc-level-name">
                {mode === "daily" ? `Daily · ${formatDailyDate(new Date())} UTC` : level.name}
                {mode === "levels" && level.unlock && (
                  <span className="pc-new">New: {level.unlock}</span>
                )}
              </h2>
              <p className="pc-level-sub">
                {mode === "daily" ? (
                  <span className="pc-best">
                    {stats.bestSeconds !== null && stats.bestTurns !== null
                      ? `Best time ${formatClock(stats.bestSeconds)} · Best turns ${stats.bestTurns}`
                      : "Same board for everyone today."}
                  </span>
                ) : (
                  level.blurb
                )}
              </p>
            </div>
          </div>
          <div className="pc-top-tools">
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pc-mute border-0 bg-transparent text-pc-accent hover:bg-transparent hover:text-pc-fg"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          </div>
          <div className="pc-hud">
            <div className="pc-meter" aria-label={`${fed.size} of ${nodeTotal} ${nodeWord} connected`}>
              <NodeGlyph theme={theme.id} on={fed.size > 0} />
              <span className="pc-meter-track">
                <span className="pc-meter-fill" style={{ width: `${meter}%` }} />
              </span>
              <span className="pc-meter-count tabular">
                {fed.size} / {nodeTotal}
              </span>
            </div>
            <p className="pc-hud-stats tabular">
              {mode === "daily" ? (
                <span className="pc-timer" role="timer" aria-label={`Time ${formatClock(elapsed)}`}>
                  <Timer aria-hidden="true" />
                  {formatClock(elapsed)}
                </span>
              ) : (
                <button
                  type="button"
                  className="pc-level-pick"
                  aria-haspopup="dialog"
                  aria-expanded={pickerOpen}
                  aria-label={`Level ${levelId} of ${LEVELS.length}. Choose a level`}
                  onClick={() => setPickerOpen((open) => !open)}
                >
                  Level {levelId}
                  <span className="text-pc-muted"> / {LEVELS.length}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
              )}
              <span className="text-pc-muted">
                {moves} {moves === 1 ? "turn" : "turns"}
              </span>
            </p>
          </div>
          {pickerOpen && mode === "levels" && (
            <LevelPicker
              current={levelId}
              unlocked={progress.unlocked}
              onPick={pickLevel}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </header>

        <div className="pc-stage">
        <div className="pc-scene pc-board-wrap" data-room={theme.id}>
          <Surroundings
            theme={theme.id}
            seed={mode === "daily" ? level.id * 31 + Math.floor(Date.now() / 86_400_000) : levelId}
            level={mode === "daily" ? 8 : levelId}
          />
          <div className="pc-tray">
          <div
            ref={boardRef}
            className="pc-board"
            role="group"
            aria-label={mode === "daily" ? "Daily board" : `Level ${levelId} board`}
            style={{ "--pc-cols": level.size } as CSSProperties}
          >
            {level.tiles.map((tile, index) => {
              const spin = spins[index] ?? tile.initial;
              const rotation = ((spin % 4) + 4) % 4;
              const { row, col } = rowCol(index, level.size);
              const locked = phase !== "play" || tile.fixed;
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
                    : tile.fixed
                      ? `Bolted pipe, ${place}`
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
                  data-fixed={tile.fixed || undefined}
                  data-nudge={nudged === index || undefined}
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
                        live={order >= 0}
                        rotation={rotation}
                        hub={tile.role === "start" ? "start" : tile.role === "end" ? "end" : "plain"}
                      />
                    </span>
                  </span>
                  {tile.fixed && <span className="pc-bolts" aria-hidden="true" />}
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

        </div>

        <footer className="pc-bottom">
          {phase === "won" && mode === "daily" && result && (
            <DailyResult result={result} stats={stats} />
          )}
          <p className="pc-status pc-tip text-sm text-pretty" aria-live="polite">
            <NodeGlyph theme={theme.id} on={phase === "won" || phase === "flow"} />
            <span>
              {phase === "won" ? (
                <>
                  <span className="font-semibold text-pc-flow">
                    {mode === "daily" ? "Challenge complete. " : "Level complete. "}
                  </span>
                  <span className="text-pc-muted">{status}</span>
                </>
              ) : (
                <span className="text-pc-muted">{status ?? theme.rule}</span>
              )}
            </span>
          </p>

          <div className="pc-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (mode === "daily" ? startDaily() : reset(levelId))}
            >
              <RotateCcw />
              Restart
            </Button>
            <Button type="button" variant="ghost" onClick={onHint}>
              <Lightbulb />
              Hint
            </Button>
            <Button type="button" variant="ghost" onClick={onUndo}>
              <Undo2 />
              Undo
            </Button>
            {phase === "won" && mode === "levels" && (
              <Button type="button" className="pc-next" onClick={() => reset(lastLevel ? 1 : levelId + 1)}>
                {lastLevel ? "Play again" : "Next level"}
                <ArrowRight />
              </Button>
            )}
            {phase === "won" && mode === "daily" && (
              <Button type="button" className="pc-next" onClick={startDaily}>
                Practice again
                <ArrowRight />
              </Button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

function turnsLabel(turns: number): string {
  return `${turns} ${turns === 1 ? "turn" : "turns"}`;
}

function dailyCheer(result: DailyFinish): string {
  if (result.newBestTime && result.newBestTurns) return "New best time and fewest turns.";
  if (result.newBestTime) return "New best time.";
  if (result.newBestTurns) return "New best for fewest turns.";
  return "Solid run. Come back tomorrow to beat your bests.";
}

function DailyResult({ result, stats }: { result: DailyFinish; stats: DailyStats }) {
  const [wait, setWait] = useState(() => untilNextDaily(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setWait(untilNextDaily(new Date())), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const cells = [
    {
      label: "Time",
      value: formatClock(result.run.seconds),
      isNew: result.newBestTime,
      best: stats.bestSeconds === null ? null : formatClock(stats.bestSeconds),
    },
    {
      label: "Turns",
      value: String(result.run.turns),
      isNew: result.newBestTurns,
      best: stats.bestTurns === null ? null : String(stats.bestTurns),
    },
  ];
  return (
    <section className="pc-daily-result" aria-label="Daily result">
      {cells.map((cell) => (
        <div key={cell.label} className="pc-daily-stat" data-new={cell.isNew || undefined}>
          <span className="pc-daily-label">{cell.label}</span>
          <span className="pc-daily-value tabular">{cell.value}</span>
          <span className="pc-daily-best">
            {cell.isNew ? <span className="pc-new">New best</span> : cell.best ? `Best ${cell.best}` : null}
          </span>
        </div>
      ))}
      <p className="pc-daily-next">
        Next board in <span className="tabular">{wait}</span>
      </p>
    </section>
  );
}

function LevelPicker({
  current,
  unlocked,
  onPick,
  onClose,
}: {
  current: number;
  unlocked: number;
  onPick: (id: number) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.(".pc-level-pick")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    panelRef.current?.querySelector<HTMLButtonElement>("[aria-current='true']")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div ref={panelRef} className="pc-picker" role="dialog" aria-label="Choose a level">
      {CHAPTERS.map((chapter) => {
        const open = chapter.from <= unlocked;
        const ids = Array.from({ length: chapter.to - chapter.from + 1 }, (_, i) => chapter.from + i);
        return (
          <section key={chapter.title} className="pc-chapter" data-open={open}>
            <header>
              <h3>{chapter.title}</h3>
              <p>{open ? chapter.note : `Finish level ${chapter.from - 1} to open`}</p>
            </header>
            <div className="pc-chapter-levels">
              {ids.map((id) => {
                const isOpen = id <= unlocked;
                const done = id < unlocked;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!isOpen}
                    aria-current={id === current}
                    aria-label={`Level ${id}${done ? ", solved" : isOpen ? "" : ", locked"}`}
                    data-done={done || undefined}
                    onClick={() => onPick(id)}
                  >
                    {isOpen ? id : <Lock aria-hidden="true" />}
                    {done && id !== current && <Check aria-hidden="true" className="pc-done" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ThemeMark({ theme }: { theme: ThemeId }) {
  if (theme === "alarm") return <BuildingArt small />;
  if (theme === "fire") return <SchoolArt small />;
  return <HouseArt small />;
}

function SourceGlyph({ theme }: { theme: ThemeId }) {
  if (theme === "alarm") return <PanelSource />;
  if (theme === "fire") return <SchoolSource />;
  return <HouseSource />;
}

function HouseSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill="#f5e4c4" />
      <path d="M14.5 30.5 32 17" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke="#b98e5c" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
      <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="#8a4a20" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" />
      <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="#c4743c" strokeWidth="8.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6 28.6 32 10.1" fill="none" stroke="#e29a62" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill="#b07a52" />
      <path d="M19.2 43.4a3.8 3.8 0 0 1 3.8-3.6" fill="none" stroke="#cfa078" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="25.6" cy="48.6" r="1.2" fill="#e6c9a2" />
      <rect x="35" y="33.5" width="12.5" height="11.5" rx="2.6" fill="#ead6b4" stroke="#c9a97c" strokeWidth="1.2" />
      <path d="M41.25 34.5v9.5M36 39.25h10.5" stroke="#c9a97c" strokeWidth="1.6" />
      <rect x="36.2" y="34.7" width="10.1" height="9.1" rx="1.8" fill="none" stroke="#fff6e6" strokeWidth="1" opacity="0.8" />
    </svg>
  );
}

function PanelSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <rect x="10" y="48" width="44" height="9" rx="3.5" fill="#5d7c99" />
      <path d="M13 49.2h38" stroke="#8ea9c2" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="12.5" y="6" width="39" height="44" rx="10" fill="#87a3bd" />
      <path d="M17 7.6h30" stroke="#b6cbdd" strokeWidth="2" strokeLinecap="round" />
      <path d="M13.3 42V16" stroke="#a7bed3" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <rect x="17.5" y="11.5" width="29" height="33" rx="5.5" fill="#9fb7cd" stroke="#6f8daa" strokeWidth="1.3" />
      <path d="M20 12.8h24" stroke="#c4d5e4" strokeWidth="1.1" strokeLinecap="round" />
      <rect x="25" y="17" width="14" height="4.4" rx="2.2" fill="#5d7c99" />
      {[23, 32, 41].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="28.5" r="3.6" fill="#5d7c99" />
          <circle cx={cx - 1.1} cy="27.4" r="1" fill="#a9bfd3" />
        </g>
      ))}
      <rect x="22" y="36.2" width="20" height="3.8" rx="1.9" fill="#5d7c99" />
    </svg>
  );
}

function SchoolSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <path d="M10 30.5 32 15l22 15.5v17a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7v-17z" fill="#fbece6" />
      <path d="M12.5 32 32 18.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M11 48.5a6.5 6.5 0 0 0 6 5h30a6.5 6.5 0 0 0 6.2-6V31" fill="none" stroke="#c98d80" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
      <path d="M6.5 34 32 16.5 57.5 34" fill="none" stroke="#8c241e" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.26" />
      <path d="M6 31.5 32 13l26 18.5" fill="none" stroke="#d9503f" strokeWidth="8.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.6 29.6 32 11.6" fill="none" stroke="#f08a78" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <circle cx="32" cy="27" r="4.6" fill="#f7dcd4" stroke="#d9503f" strokeWidth="1.6" />
      <path d="M32 24.6V27l1.6 1.2" fill="none" stroke="#b33a2e" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26.5 54.5V45a5.5 5.5 0 0 1 11 0v9.5z" fill="#c4544c" />
      <path d="M32 40v14.5" stroke="#a8403a" strokeWidth="1" />
      {[16.5, 47.5].map((x) => (
        <rect key={x} x={x - 3.5} y="38" width="7" height="7" rx="1.8" fill="#f3d4cb" stroke="#d99a8c" strokeWidth="1.1" />
      ))}
    </svg>
  );
}

function NodeGlyph({ theme, on }: { theme: ThemeId; on: boolean }) {
  if (theme === "alarm") return <Sensor on={on} />;
  if (theme === "fire") return <Strobe on={on} />;
  return <Bulb on={on} />;
}

const GLASS =
  "M24 2.5c-10.2 0-16.5 8.2-16.5 17.6 0 6.4 3.5 10.8 6.6 13.8 1.2 1.2 2.1 2.9 2.1 4.8V42h15.6v-3.3c0-1.9.9-3.6 2.1-4.8 3.1-3 6.6-7.4 6.6-13.8C40.5 10.7 34.2 2.5 24 2.5z";

function Bulb({ on }: { on: boolean }) {
  const lead = on ? "#ffc93c" : "#a57d42";
  return (
    <svg viewBox="0 0 48 60" className={on ? "pc-glyph pc-bulb is-on" : "pc-glyph pc-bulb"}>
      <path d={GLASS} fill={on ? "#fff4c4" : "#f6dc9c"} stroke={on ? "#d9a63e" : "#9c6a2c"} strokeWidth="1.8" />
      {on && (
        <>
          <ellipse cx="24" cy="29" rx="12" ry="11" fill="#fff8d6" opacity="0.9" />
          <ellipse cx="24" cy="30" rx="6.5" ry="7.5" fill="white" opacity="0.85" />
        </>
      )}
      <path d="M31 9.5c5.2 3.6 7 10.4 4.4 16" fill="none" stroke={on ? "#e8b84e" : "#b98a44"} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M14.6 9.2c-2.7 3.2-3.3 7.8-1.3 11.6" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity={on ? 0.9 : 0.75} />
      <path d="M21 40c0-7-2.4-12.2-2-18M27 40c0-7 2.4-12.2 2-18" fill="none" stroke={lead} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M24 40V27.5" stroke={lead} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 22q5 3.6 10 0" fill="none" stroke={on ? "white" : lead} strokeWidth={on ? 1.5 : 1.1} strokeLinecap="round" />
      <circle cx="19" cy="22" r={on ? 2.2 : 1.8} fill={on ? "#fff3b0" : lead} />
      <circle cx="29" cy="22" r={on ? 2.2 : 1.8} fill={on ? "#fff3b0" : lead} />
      <rect x="20" y="37.4" width="8" height="4" rx="1.5" fill={on ? "#ffe39a" : "#dcc08a"} />
      <rect x="15.5" y="41.6" width="17" height="3.8" rx="1.4" fill="#cbb37c" />
      {[45.6, 48.8, 52].map((y) => (
        <g key={y}>
          <rect x="15" y={y} width="18" height="3" rx="1.5" fill="#a38c5a" />
          <path d={`M16.6 ${y + 0.8}h14.8`} stroke="#e2d2a4" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      ))}
      <path d="M18.6 55h10.8l-1.7 3a2 2 0 0 1-1.8 1h-3.8a2 2 0 0 1-1.8-1z" fill="#86703f" />
    </svg>
  );
}

function Sensor({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 56" className={on ? "pc-glyph pc-badge is-on" : "pc-glyph pc-badge"}>
      <circle cx="28.4" cy="29.2" r="24.6" fill="#9fb2c4" />
      <circle cx="28" cy="28" r="24.6" fill="#e2e9ef" stroke="#b4c3d1" strokeWidth="1" />
      <path d="M5.4 28A22.6 22.6 0 0 1 28 5.4" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="28" cy="28" r="19.6" fill="#cfdae5" stroke="#aebfcf" strokeWidth="1.2" />
      <path d="M11.8 36A17.8 17.8 0 0 0 44.2 36" fill="none" stroke="white" strokeWidth="1.3" opacity="0.75" />
      <g transform="translate(28 29) scale(1.2) translate(-28 -29)">
      <path
        d="M28 15.4c3.4 2.5 7 3.4 11 3.6v8.8c0 7.7-4.5 12.9-11 15.6-6.5-2.7-11-7.9-11-15.6V19c4-.2 7.6-1.1 11-3.6z"
        fill="#2f5f8c"
        opacity="0.35"
        transform="translate(0.8 1.6)"
      />
      <path
        d="M28 15.4c3.4 2.5 7 3.4 11 3.6v8.8c0 7.7-4.5 12.9-11 15.6-6.5-2.7-11-7.9-11-15.6V19c4-.2 7.6-1.1 11-3.6z"
        fill={on ? "#3d9be6" : "#6a9bcb"}
      />
      <path d="M18.6 20.4c3.6-.4 6.6-1.4 9.4-3.2" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M18.6 21.5v6.3c0 4.6 2 8.2 5.2 10.8" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <circle cx="28" cy="28.6" r="6" fill={on ? "#2f84cc" : "#5687b8"} />
      <circle cx="28" cy="28.6" r="3.9" fill={on ? "#bff4ff" : "#b8cfe4"} />
      <circle cx="26.9" cy="27.4" r="1.3" fill="white" opacity={on ? 1 : 0.8} />
      </g>
    </svg>
  );
}

const RIDGES = Array.from({ length: 40 }, (_, index) => {
  const angle = (index / 40) * Math.PI * 2;
  const at = (radius: number) =>
    `${(28 + Math.cos(angle) * radius).toFixed(2)} ${(28 + Math.sin(angle) * radius).toFixed(2)}`;
  return `M${at(10.6)}L${at(15.4)}`;
});

function Strobe({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 56" className={on ? "pc-glyph pc-badge is-on" : "pc-glyph pc-badge"}>
      {[
        [28, 4.4],
        [28, 51.6],
        [4.4, 28],
        [51.6, 28],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="#d4473a" />
      ))}
      <circle cx="28" cy="28" r="22.6" fill="#e4523f" />
      <path d="M9.6 20A20 20 0 0 1 34 8.8" fill="none" stroke="#f38b78" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M46.4 36A20 20 0 0 1 22 47.2" fill="none" stroke="#b5352a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="28" cy="28" r="17.8" fill="#c23e30" />
      <circle cx="28" cy="28" r="16.6" fill={on ? "#ffe2ad" : "#f8f4f0"} />
      {RIDGES.map((ridge) => (
        <path
          key={ridge}
          d={ridge}
          stroke={on ? "#ffb35a" : "#d9d0c7"}
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      ))}
      <circle cx="28" cy="28" r="9.4" fill={on ? "#fff7e6" : "white"} stroke={on ? "#ffc070" : "#e2d9d0"} strokeWidth="1" />
      {on && <circle cx="28" cy="28" r="5.6" fill="white" />}
      <path d="M17.4 21.5A12.2 12.2 0 0 1 27 14.2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
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
  const size = level.size;
  const linked = new Set<number>();
  cells.forEach((cell, index) => {
    const mask = cellMask(cell);
    const { row, col } = rowCol(index, size);
    for (const dir of DIRS) {
      if ((mask & dir.bit) === 0) continue;
      const nextRow = row + dir.dr;
      const nextCol = col + dir.dc;
      if (nextRow < 0 || nextCol < 0 || nextRow >= size || nextCol >= size) continue;
      const neighbor = nextRow * size + nextCol;
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
