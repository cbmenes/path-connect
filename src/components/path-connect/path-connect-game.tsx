import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  ArrowRight,
  Ban,
  Check,
  ChevronDown,
  Lightbulb,
  Lock,
  RotateCcw,
  RotateCw,
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
  openingIds,
  reachTargets,
  rowCol,
} from "@/lib/path-connect/logic";
import {
  hintOffer,
  keepUses,
  pickHint,
  readHintUses,
  turnsToSolve,
  writeHintUses,
  type Hint,
  type HintUses,
} from "@/lib/path-connect/hint";
import { readProgress, writeProgress, type Progress } from "@/lib/path-connect/progress";
import { markOnboarded, needsOnboarding } from "@/lib/path-connect/onboarding";
import { rewardedAds } from "@/lib/path-connect/rewarded-ad";
import { playTurn, playWin } from "@/lib/path-connect/sound";
import { themeById, type CircuitTheme, type ThemeId } from "@/lib/path-connect/styles";
import { Surroundings } from "@/components/path-connect/surroundings";
import { TileArt } from "@/components/path-connect/tile-art";

type Phase = "play" | "won";
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

interface PlayLayout {
  trayTop: number;
  stageHeight: number;
  footerHeight: number;
  /** Free space between the board tray and the footer. */
  room: number;
}

interface Charge {
  head: Point;
  trail: Point[];
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Rotate every tile, including the panel and the nodes, until each node is
 * powered. Hint lights one tile per use. Undo stays a note for now.
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
  /**
   * Id of the latest win effect, or 0 on a fresh board. Its CSS animations run
   * once, about a second, and rest at their end state, so the board settles
   * without another render.
   */
  const [celebrate, setCelebrate] = useState(0);
  const celebrateIdRef = useRef(0);
  const [note, setNote] = useState<string | null>(null);
  const [motionOn, setMotionOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState<Progress>({ level: 1, unlocked: 1 });
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nudged, setNudged] = useState<number | null>(null);
  const [hintUses, setHintUses] = useState<HintUses>({});
  const hintUsesRef = useRef(hintUses);
  const [hint, setHint] = useState<Hint | null>(null);
  const [adStep, setAdStep] = useState<"offer" | "playing" | null>(null);
  const [lesson, setLesson] = useState<1 | 2 | null>(null);
  const adAbortRef = useRef<AbortController | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const playLayoutRef = useRef<PlayLayout | null>(null);
  const theme = themeById(level.theme);
  const lastLevel = levelId === LEVELS.length;
  const nextUnlock = lastLevel ? undefined : LEVELS[levelId]?.unlock;
  const levelUnlock = level.unlock;
  const linked = linkedIndexes(level, spins);
  const network = reachTargets(boardCells(level, spins));
  const fed = new Set(network.reached);
  const charged = new Set(network.paths.flat());
  const nodeTotal = level.tiles.filter((tile) => tile.role === "end").length;
  const fixtureOf = useMemo(() => {
    const map = new Map<number, number>();
    level.tiles.forEach((tile, index) => {
      if (tile.role === "end") map.set(index, map.size);
    });
    return map;
  }, [level]);
  const nodeWord = nodeTotal === 1 ? theme.node : theme.nodePlural;
  const meter = nodeTotal === 0 ? 0 : Math.round((fed.size / nodeTotal) * 100);
  // The pulse sweeps the whole path in about a third of a second on any board size.
  const waveStep = flowPath && flowPath.length > 1 ? Math.min(36, 320 / (flowPath.length - 1)) : 0;
  const boardKey = mode === "daily" ? `daily:${todayKey}` : `level:${levelId}`;
  const offer = hintOffer(hintUses[boardKey] ?? 0);
  const hintTile = hint && phase === "play" ? level.tiles[hint.index] : undefined;
  const hintLeft =
    hint && hintTile ? turnsToSolve(hintTile.kind, spins[hint.index] ?? hintTile.initial, hintTile.solution) : 0;

  useEffect(() => () => adAbortRef.current?.abort(), []);

  // Remember where things sit during play, so a win can hold the board still.
  useLayoutEffect(() => {
    if (phase !== "play") return;
    const stage = stageRef.current;
    const footer = footerRef.current;
    const tray = boardRef.current?.parentElement;
    if (!stage || !footer || !tray) return;
    stage.style.minHeight = "";
    stage.style.translate = "";
    footer.style.marginTop = "";
    playLayoutRef.current = {
      trayTop: tray.getBoundingClientRect().top + window.scrollY,
      stageHeight: stage.getBoundingClientRect().height,
      footerHeight: footer.getBoundingClientRect().height,
      room: footer.getBoundingClientRect().top - tray.getBoundingClientRect().bottom - 8,
    };
  });

  // When Next or the Daily result makes the footer taller, it grows upward into
  // the empty space under the board, and the board keeps its place. Whatever
  // does not fit extends the page downward. A header that rewraps is offset too.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const footer = footerRef.current;
    const tray = boardRef.current?.parentElement;
    const before = playLayoutRef.current;
    if (phase !== "won" || !stage || !footer || !tray || !before) return;
    const grow = footer.getBoundingClientRect().height - before.footerHeight;
    stage.style.minHeight = `${before.stageHeight}px`;
    footer.style.marginTop = `${-Math.max(0, Math.min(grow, before.room))}px`;
    const drift = before.trayTop - (tray.getBoundingClientRect().top + window.scrollY);
    if (Math.abs(drift) >= 0.5) stage.style.translate = `0 ${drift}px`;
    const release = () => {
      stage.style.minHeight = "";
      stage.style.translate = "";
      footer.style.marginTop = "";
    };
    window.addEventListener("resize", release);
    return () => window.removeEventListener("resize", release);
  }, [phase, result]);

  useEffect(() => {
    const saved = readStats();
    setStats(saved);
  }, []);

  useEffect(() => {
    const saved = readProgress(LEVELS.length);
    progressRef.current = saved;
    setProgress(saved);
    hintUsesRef.current = readHintUses();
    setHintUses(hintUsesRef.current);
    if (saved.level !== 1) reset(saved.level, { keepHints: true });
    if (needsOnboarding()) setLesson(1);
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
    setCelebrate(0);
    setNote(null);
    setResult(null);
    closeAd();
    setHint(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotionOn(true));
    });
  }

  function saveHintUses(next: HintUses, campaignId: number) {
    const kept = keepUses(next, [`level:${campaignId}`, `daily:${todayKey}`]);
    hintUsesRef.current = kept;
    setHintUses(kept);
    writeHintUses(kept);
  }

  function reset(nextId: number, { keepHints = false } = {}) {
    const next = LEVELS[nextId - 1];
    if (!next) return;
    // Restart keeps the hints already used. A new level starts with its free hint.
    if (nextId !== levelId && !keepHints) {
      saveHintUses({ ...hintUsesRef.current, [`level:${nextId}`]: 0 }, nextId);
    }
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
    setCelebrate(0);
    setNote(snap.note);
    setResult(null);
    closeAd();
    setHint(null);
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
    if (hint && hint.index === index && turnsToSolve(tile.kind, nextSpins[index]!, tile.solution) === 0) {
      setHint(null);
      setNote("That one is set. Keep going.");
    }
    const network = reachTargets(boardCells(level, nextSpins));
    if (!network.complete) return;
    setHint(null);
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
    // The board counts as won at once, so Next works while the effect plays.
    phaseRef.current = "won";
    setPhase("won");
    playWin(mutedRef.current);
    if (!prefersReducedMotion()) {
      celebrateIdRef.current += 1;
      setCelebrate(celebrateIdRef.current);
    }
  }

  function giveHint() {
    const next = pickHint(level, spinsRef.current);
    if (!next) return;
    const uses = hintUsesRef.current;
    saveHintUses({ ...uses, [boardKey]: (uses[boardKey] ?? 0) + 1 }, levelId);
    setHint(next);
    const tile = level.tiles[next.index]!;
    const what = (tile.role === "start" ? theme.source : tile.role === "end" ? theme.node : "pipe").toLowerCase();
    setNote(`Hint: turn the glowing ${what} ${next.turns === 1 ? "once" : `${next.turns} times`}.`);
  }

  function onHint() {
    if (phaseRef.current !== "play" || adStep) return;
    if (hint) {
      setNote("Your hint is still glowing on the board.");
      return;
    }
    if (offer === "free") giveHint();
    else if (offer === "ad") setAdStep("offer");
    else setNote("No hints left on this board. You've got this.");
  }

  function closeAd() {
    adAbortRef.current?.abort();
    adAbortRef.current = null;
    setAdStep(null);
  }

  function declineAd() {
    const playing = adStep === "playing";
    closeAd();
    setNote(playing ? "The ad closed early, so no extra hint." : "No extra hint this time. Keep going.");
  }

  async function watchAd() {
    const controller = new AbortController();
    adAbortRef.current = controller;
    setAdStep("playing");
    const outcome = await rewardedAds.show(controller.signal);
    if (adAbortRef.current !== controller) return;
    adAbortRef.current = null;
    setAdStep(null);
    if (outcome === "rewarded") giveHint();
    else if (outcome === "unavailable") setNote("No ad is ready right now, so no extra hint.");
    else setNote("The ad closed early, so no extra hint.");
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
        data-celebrate={celebrate > 0 || undefined}
      >
        <h1 className="sr-only">Path Connect · {theme.title}</h1>
        <header className="pc-top">
          <div className="pc-where">
            <ThemeMark theme={theme.id} />
            <div className="min-w-0">
              <h2 className="pc-level-name">
                {mode === "daily"
                  ? `Daily · ${formatDailyDate(new Date())} UTC`
                  : level.name}
                {mode === "levels" && levelUnlock && <span className="pc-new">New: {levelUnlock}</span>}
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

        <div ref={stageRef} className="pc-stage">
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
                  data-hint={(hintTile && hint?.index === index && hintLeft > 0) || undefined}
                  aria-disabled={locked}
                  aria-label={
                    hint?.index === index && hintLeft > 0
                      ? `${label}. Hint: ${hintLeft === 1 ? "one turn" : `${hintLeft} turns`}`
                      : label
                  }
                  style={
                    {
                      "--delay": order >= 0 ? `${order * 180}ms` : "0ms",
                      "--wave": order >= 0 ? `${Math.round(order * waveStep)}ms` : "0ms",
                    } as CSSProperties
                  }
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
                        gauge={PIPE_GAUGE}
                        hub={tile.role === "start" ? "start" : tile.role === "end" ? "end" : "plain"}
                      />
                    </span>
                  </span>
                  {tile.fixed && <span className="pc-bolts" aria-hidden="true" />}
                  {hintTile && hint?.index === index && hintLeft > 0 && (
                    <span className="pc-hint-badge tabular" aria-hidden="true">
                      <RotateCw />
                      {hintLeft}
                    </span>
                  )}
                  {tile.role === "start" && (
                    <span className="pc-mark pc-source">
                      <SourceGlyph theme={theme.id} />
                    </span>
                  )}
                  {tile.role === "end" && (
                    <span className={powered ? "pc-mark pc-plant is-fed" : "pc-mark pc-plant"}>
                      <NodeGlyph theme={theme.id} on={powered || order >= 0} fixture={fixtureOf.get(index)} />
                    </span>
                  )}
                </button>
              );
            })}
            {celebrate > 0 && flowPaths && (
              <ChargeRun key={celebrate} paths={flowPaths} boardRef={boardRef} />
            )}
            {celebrate > 0 && flowPath && (
              <span className="pc-sparkles" aria-hidden="true">
                {sparkleCells(flowPath).map((cell) => {
                  const { row, col } = rowCol(cell, level.size);
                  return (
                    <span
                      key={`${celebrate}-${cell}`}
                      className="pc-sparkle"
                      style={
                        {
                          left: `${((col + 0.5) / level.size) * 100}%`,
                          top: `${((row + 0.5) / level.size) * 100}%`,
                          "--wave": `${Math.round(flowPath.indexOf(cell) * waveStep)}ms`,
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </span>
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

        {adStep && (
          <RewardedHint
            step={adStep}
            seconds={rewardedAds.placeholderSeconds}
            placeholder={rewardedAds.placeholder}
            onWatch={watchAd}
            onDecline={declineAd}
          />
        )}

        {lesson && (
          <PowerLesson
            step={lesson}
            theme={theme}
            onNext={() => setLesson(2)}
            onDone={() => {
              markOnboarded();
              setLesson(null);
            }}
          />
        )}
        </div>

        <footer ref={footerRef} className="pc-bottom">
          {phase === "won" && mode === "daily" && result && (
            <DailyResult result={result} stats={stats} />
          )}
          <p className="pc-status pc-tip text-sm text-pretty" aria-live="polite">
            <NodeGlyph theme={theme.id} on={phase === "won"} />
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
            <Button
              type="button"
              variant="ghost"
              className="pc-hint"
              data-offer={offer}
              aria-label={
                offer === "free"
                  ? "Hint, one free"
                  : offer === "ad"
                    ? "Hint, watch an ad for one more"
                    : "Hint, none left"
              }
              disabled={phase !== "play"}
              onClick={onHint}
            >
              <Lightbulb />
              Hint
              {offer === "ad" && <span className="pc-hint-tag">Ad</span>}
              {offer === "none" && <span className="pc-hint-tag">0 left</span>}
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

interface LessonTile {
  kind: Level["tiles"][number]["kind"];
  rotation: number;
  role: "start" | "end" | "play";
  /** Steps from the source along the lit path, or -1 for a pipe off the path. */
  order: number;
}

/**
 * Three by two: the source feeds a tee, which branches to one node on the
 * right and, through a corner, to a second node below it. The last tile is
 * the second node, which step two first points at the back of the first node.
 */
const LESSON_TILES: readonly LessonTile[] = [
  { kind: "cap", rotation: 1, role: "start", order: 0 },
  { kind: "tee", rotation: 1, role: "play", order: 1 },
  { kind: "cap", rotation: 3, role: "end", order: 2 },
  { kind: "corner", rotation: 0, role: "play", order: -1 },
  { kind: "corner", rotation: 0, role: "play", order: 2 },
  { kind: "cap", rotation: 3, role: "end", order: 3 },
];
const LESSON_STEP_MS = 260;
const LESSON_TURN_AT = 1700;

function PowerLesson({
  step,
  theme,
  onNext,
  onDone,
}: {
  step: 1 | 2;
  theme: CircuitTheme;
  onNext: () => void;
  onDone: () => void;
}) {
  const source = theme.source.toLowerCase();
  const nodes = theme.nodePlural[0]!.toUpperCase() + theme.nodePlural.slice(1);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <div className="pc-ad-scrim">
      <section
        className="pc-ad pc-lesson"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-lesson-title"
        aria-describedby="pc-lesson-body"
      >
        <p className="pc-lesson-step">
          <span className="sr-only">Step {step} of 2</span>
          <span className="pc-lesson-dot" data-on={step === 1 || undefined} aria-hidden="true" />
          <span className="pc-lesson-dot" data-on={step === 2 || undefined} aria-hidden="true" />
        </p>
        <LessonBoard key={step} step={step} theme={theme.id} />
        {step === 1 ? (
          <>
            <h3 id="pc-lesson-title" className="pc-ad-title">
              Power starts at the {source}
            </h3>
            <p id="pc-lesson-body" className="pc-ad-body">
              Each board has one {source}. Power flows out of it and only through pipes whose ends face
              each other.
            </p>
            <p className="pc-lesson-note">
              <span className="pc-lesson-icon" aria-hidden="true">
                <SourceGlyph theme={theme.id} />
              </span>
              The only power source
            </p>
          </>
        ) : (
          <>
            <h3 id="pc-lesson-title" className="pc-ad-title">
              Branch out to every {theme.node}
            </h3>
            <p id="pc-lesson-body" className="pc-ad-body">
              A {theme.node} is an endpoint. Power stops there and never passes on, so each{" "}
              {theme.node} needs its own path back to the {source}.
            </p>
            <p className="pc-lesson-note">
              <span className="pc-lesson-icon pc-lesson-stop-icon" aria-hidden="true">
                <Ban />
              </span>
              {nodes} don't pass power on
            </p>
          </>
        )}
        <div className="pc-ad-actions">
          {step === 1 ? (
            <>
              <Button key="skip" type="button" variant="ghost" onClick={onDone}>
                Skip
              </Button>
              <Button key="next" autoFocus type="button" className="pc-ad-watch" onClick={onNext}>
                Next
                <ArrowRight />
              </Button>
            </>
          ) : (
            <Button key="start" autoFocus type="button" className="pc-ad-watch" onClick={onDone}>
              Start playing
              <ArrowRight />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function LessonBoard({ step, theme }: { step: 1 | 2; theme: ThemeId }) {
  const [elapsed, setElapsed] = useState(0);
  const motion = !prefersReducedMotion();
  const end = step === 1 ? 300 + 4 * LESSON_STEP_MS : LESSON_TURN_AT + 4 * LESSON_STEP_MS;

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now() - started;
      setElapsed(now);
      if (now >= end) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [end]);

  const turns = step === 1 ? 3 : elapsed < LESSON_TURN_AT ? 0 : Math.min(3, 1 + Math.floor((elapsed - LESSON_TURN_AT) / LESSON_STEP_MS));
  const blocked = step === 2 && turns < 3;
  const lit = (tile: LessonTile, index: number) => {
    if (tile.order < 0) return false;
    if (index === 5 && step === 2) return turns === 3 && elapsed >= LESSON_TURN_AT + 3 * LESSON_STEP_MS;
    return elapsed >= 300 + tile.order * LESSON_STEP_MS;
  };

  return (
    <div className="pc-lesson-board pc-tray" aria-hidden="true">
      <div className="pc-board" style={{ "--pc-cols": 3 } as CSSProperties}>
        {LESSON_TILES.map((tile, index) => {
          const rotation = index === 5 ? (step === 1 ? 3 : turns) : tile.rotation;
          const on = lit(tile, index);
          return (
            <span
              key={index}
              className="pc-tile"
              data-role={tile.role}
              data-live={on}
              data-charged={on}
              data-fed={tile.role === "end" && on}
              data-spot={(step === 1 && tile.role === "start") || undefined}
            >
              <span className="pc-depth">
                <span
                  className={motion ? "pc-spin" : "pc-spin pc-spin-off"}
                  style={{ transform: `rotate(${rotation * 90}deg)` }}
                >
                  <TileArt
                    kind={tile.kind}
                    conduit="pipe"
                    gauge={PIPE_GAUGE}
                    live={on}
                    rotation={rotation}
                    hub={tile.role === "start" ? "start" : tile.role === "end" ? "end" : "plain"}
                  />
                </span>
              </span>
              {tile.role === "start" && (
                <span className="pc-mark pc-source">
                  <SourceGlyph theme={theme} />
                </span>
              )}
              {tile.role === "end" && (
                <span className={on ? "pc-mark pc-plant is-fed" : "pc-mark pc-plant"}>
                  <NodeGlyph theme={theme} on={on} />
                </span>
              )}
            </span>
          );
        })}
        {blocked && (
          <span className="pc-lesson-stop">
            <Ban />
          </span>
        )}
      </div>
    </div>
  );
}

function RewardedHint({
  step,
  seconds,
  placeholder,
  onWatch,
  onDecline,
}: {
  step: "offer" | "playing";
  seconds: number;
  placeholder: boolean;
  onWatch: () => void;
  onDecline: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDecline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDecline]);

  useEffect(() => {
    if (step !== "playing") return;
    const started = performance.now();
    setLeft(seconds);
    const id = window.setInterval(() => {
      setLeft(Math.max(0, Math.ceil(seconds - (performance.now() - started) / 1000)));
    }, 200);
    return () => window.clearInterval(id);
  }, [step, seconds]);

  return (
    <div className="pc-ad-scrim">
      <section
        className="pc-ad"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-ad-title"
        aria-describedby="pc-ad-body"
      >
        {step === "offer" ? (
          <>
            <h3 id="pc-ad-title" className="pc-ad-title">
              Want one more hint?
            </h3>
            <p id="pc-ad-body" className="pc-ad-body">
              Your free hint is used. Watch a short ad to light up one more tile.
            </p>
            <div className="pc-ad-actions">
              <Button type="button" variant="ghost" onClick={onDecline}>
                No thanks
              </Button>
              <Button autoFocus type="button" className="pc-ad-watch" onClick={onWatch}>
                Watch ad
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="pc-ad-title" className="pc-ad-title">
              {placeholder ? "Ad placeholder" : "Ad playing"}
            </h3>
            <p id="pc-ad-body" className="pc-ad-body">
              {placeholder
                ? "Rewarded ads are not connected yet. Your hint arrives when this finishes."
                : "Your hint arrives when the ad finishes."}
            </p>
            <div className="pc-ad-meter" aria-hidden="true">
              <span style={{ width: `${((seconds - left) / seconds) * 100}%` }} />
            </div>
            <p className="pc-ad-count tabular" aria-live="polite">
              {left > 0 ? `${left} s left` : "Done"}
            </p>
            <div className="pc-ad-actions">
              <Button autoFocus type="button" variant="ghost" onClick={onDecline}>
                Close, skip hint
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * The charge bead that runs the finished circuit. It keeps its own state, so
 * each frame re-renders only the bead and its trail, not the whole board.
 */
function ChargeRun({
  paths: allPaths,
  boardRef,
}: {
  paths: readonly number[][];
  boardRef: RefObject<HTMLDivElement | null>;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);

  useEffect(() => {
    const paths = allPaths.filter((path) => path.length > 1);
    if (paths.length === 0) return;
    let frame = 0;
    let cancelled = false;
    let centers = measureCenters(boardRef.current);
    const started = performance.now();
    const spans = paths.map((path) => path.length - 1);
    const total = spans.reduce((sum, span) => sum + span, 0);
    const duration = Math.min(800, Math.max(450, total * 30));
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
      const from = centers[path[step]!];
      const to = centers[path[step + 1]!];
      if (from && to) {
        const head = {
          x: from.x + (to.x - from.x) * along,
          y: from.y + (to.y - from.y) * along,
        };
        setCharge((prev) => ({
          head,
          trail: prev ? [prev.head, ...prev.trail].slice(0, 22) : [],
        }));
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCharge(null);
    };
    frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(() => {
      centers = measureCenters(boardRef.current);
    });
    if (boardRef.current) observer.observe(boardRef.current);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [allPaths, boardRef]);

  if (!charge) return null;
  return (
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
  );
}

/** A few evenly spaced path cells for sparkles, so the effect stays light. */
function sparkleCells(path: readonly number[]): number[] {
  const count = Math.min(7, path.length);
  if (count === 0) return [];
  const step = path.length / count;
  return Array.from({ length: count }, (_, index) => path[Math.floor(index * step + step / 2)]!);
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
  if (theme === "plumbing") return <FaucetMark />;
  if (theme === "alarm") return <HornMark />;
  if (theme === "fire") return <FireMark />;
  return <HouseArt small />;
}

function SourceGlyph({ theme }: { theme: ThemeId }) {
  if (theme === "plumbing") return <MainSource />;
  if (theme === "alarm") return <PaHouseSource />;
  if (theme === "fire") return <FireHouseSource />;
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

/** `fixture` is the node's place in board order: House Lights cycles bulb, sage lamp, bulb, caged light; plumbing cycles tub, toilet, sink; PA cycles horn, microphone, radio, telephone; fire alternates detector and bell. */
function NodeGlyph({ theme, on, fixture = 2 }: { theme: ThemeId; on: boolean; fixture?: number }) {
  if (theme === "plumbing") {
    const pick = fixture % 3;
    if (pick === 0) return <Tub on={on} />;
    if (pick === 1) return <Toilet on={on} />;
    return <Sink on={on} />;
  }
  if (theme === "alarm") {
    const pick = fixture % 4;
    if (pick === 0) return <Horn on={on} />;
    if (pick === 1) return <Microphone on={on} />;
    if (pick === 2) return <Radio on={on} />;
    return <Telephone on={on} />;
  }
  if (theme === "fire") return fixture % 2 === 0 ? <FireDetector on={on} /> : <FireBell on={on} />;
  const pick = fixture % 4;
  if (pick === 1) return <SageLamp on={on} />;
  if (pick === 3) return <CageLight on={on} />;
  return <Bulb on={on} />;
}

const SAGE_SHADE = "#a9bd9f";
const SAGE_SHADE_DARK = "#7f9476";
const SAGE_SHADE_LIGHT = "#d3dfca";
const SAGE_SHADE_DEEP = "#6a7f62";

/** Light sage 1950s mushroom-dome table lamp with a sage stem and a rounded sage base. */
function SageLamp({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 48 60" className={on ? "pc-glyph pc-lamp is-on" : "pc-glyph pc-lamp"}>
      {on && <path d="M8 31 3 50h42l-5-19z" fill="#fff1c2" opacity="0.32" />}
      <ellipse cx="24" cy="55.6" rx="14.4" ry="3.8" fill={SAGE_SHADE_DEEP} />
      <path d="M9.6 55.2v-2.4c0-3.6 6.4-6.2 14.4-6.2s14.4 2.6 14.4 6.2v2.4c0 2.2-6.4 3.8-14.4 3.8s-14.4-1.6-14.4-3.8z" fill={SAGE_SHADE_DARK} />
      <ellipse cx="24" cy="52.6" rx="14.4" ry="5.4" fill={SAGE_SHADE} />
      <path d="M13.4 51.2c2.6-1.8 6.4-2.6 10.6-2.6" fill="none" stroke={SAGE_SHADE_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.2 51.4 21 33h6l1.8 18.4c-1.4 1-8.2 1-9.6 0z" fill={SAGE_SHADE_DARK} />
      <path d="M27 33l1.8 18.4c-.6.4-1.6.7-2.8.8L24.6 33z" fill={SAGE_SHADE_DEEP} opacity="0.45" />
      <path d="M22.2 35.4 21.4 49.6" stroke={SAGE_SHADE_LIGHT} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="24" cy="42" rx="4.6" ry="1.7" fill={SAGE_SHADE} />
      <ellipse cx="24" cy="33.4" rx="5" ry="1.9" fill={SAGE_SHADE} />
      <path d="M2 30.6C2 15 11.6 3.4 24 3.4S46 15 46 30.6c0 1.4-.6 2.4-2 2.6H4c-1.4-.2-2-1.2-2-2.6z" fill={SAGE_SHADE} />
      <path d="M46 30.6C46 17 39 6.8 29.4 4.2 36 9.4 40 18.6 40 30.6c0 1.2-.4 2.2-1.4 2.6H44c1.4-.2 2-1.2 2-2.6z" fill={SAGE_SHADE_DARK} opacity="0.5" />
      <path d="M8 22.4C9.6 13.6 15.4 7.6 22.4 6.4" fill="none" stroke={SAGE_SHADE_LIGHT} strokeWidth="3" strokeLinecap="round" />
      <path d="M7 26.6c.2-1.8.6-3.4 1.2-5" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="24" cy="31.8" rx="21.6" ry="3.4" fill={SAGE_SHADE_DARK} />
      <ellipse cx="24" cy="32.4" rx="17.4" ry="2.4" fill={on ? "#fff4cc" : SAGE_SHADE_DEEP} />
      {on && <ellipse cx="24" cy="32.6" rx="7" ry="1.4" fill="white" opacity="0.9" />}
    </svg>
  );
}

/** Bronze caged lamp: a full barrel cage around a warm bulb, with a domed cap and a round base. */
function CageLight({ on }: { on: boolean }) {
  const bars = [-1, -0.5, 0, 0.5, 1];
  const back = [-0.75, -0.25, 0.25, 0.75];
  return (
    <svg viewBox="0 0 48 60" className={on ? "pc-glyph pc-lamp is-on" : "pc-glyph pc-lamp"}>
      <ellipse cx="24" cy="56" rx="15" ry="3.4" fill={BRONZE_DARK} />
      <path d="M9 54.6v-3.4c0-2.4 6.6-4 15-4s15 1.6 15 4v3.4c0 1.8-6.6 3.2-15 3.2s-15-1.4-15-3.2z" fill={BRONZE} />
      <ellipse cx="24" cy="51.2" rx="15" ry="3.2" fill={BRONZE_LIGHT} opacity="0.55" />
      <path d="M12 53.4c3 1 7.4 1.6 12 1.6" fill="none" stroke={BRONZE_DARK} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {back.map((t) => (
        <path key={t} d={`M${24 + t * 13} 16Q${24 + t * 19} 32 ${24 + t * 14} 49`} fill="none" stroke={BRONZE_DARK} strokeWidth="1.2" opacity="0.55" />
      ))}
      <ellipse cx="24" cy="33" rx="10.4" ry="13" fill={on ? "#fff1c0" : "#f1dfb2"} />
      <ellipse cx="24" cy="34" rx={on ? 6.4 : 5} ry={on ? 8.4 : 6.6} fill={on ? "white" : "#f8ecca"} opacity={on ? 0.95 : 0.8} />
      <path d="M21 45c0-5-1.4-9-1-13.4M27 45c0-5 1.4-9 1-13.4" fill="none" stroke={on ? "#ffc93c" : "#a57d42"} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M20 31.4q4 2.8 8 0" fill="none" stroke={on ? "#fff3b0" : "#a57d42"} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M19.6 40.4c-1.6-2-2.4-4.6-2.4-7.4" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      {bars.map((t) => (
        <g key={t}>
          <path d={`M${24 + t * 13.4} 16Q${24 + t * 20.4} 32 ${24 + t * 14.4} 49`} fill="none" stroke={BRONZE_DARK} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M${24 + t * 13.4 - 0.5} 17Q${24 + t * 20.4 - 0.6} 32 ${24 + t * 14.4 - 0.5} 48`} fill="none" stroke={BRONZE_LIGHT} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
        </g>
      ))}
      {[
        [24, 12.4],
        [36, 17.2],
      ].map(([y, half]) => (
        <path key={y} d={`M${24 - half} ${y}Q24 ${y + 4} ${24 + half} ${y}`} fill="none" stroke={BRONZE} strokeWidth="2" strokeLinecap="round" />
      ))}
      <path d="M8.6 17.4Q9.6 4.6 24 4.2q14.4.4 15.4 13.2z" fill={BRONZE} />
      <path d="M39.4 17.4Q38.6 7.4 29 4.8c4.4 3 6.6 7.4 7 12.6z" fill={BRONZE_DARK} opacity="0.45" />
      <path d="M13.4 12.8c1.6-3.6 4.8-5.8 9-6.4" fill="none" stroke={BRONZE_LIGHT} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="8.2" y="15.6" width="31.6" height="4" rx="2" fill={BRONZE_DARK} />
      <path d="M10 16.6h28" stroke={BRONZE_LIGHT} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <rect x="20.6" y="0.8" width="6.8" height="4.6" rx="2" fill={BRONZE_DARK} />
      <path d="M22 1.8h4" stroke={BRONZE_LIGHT} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
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

const FIRE_RED = "#c94a3c";
const FIRE_RED_DARK = "#9e3328";
const FIRE_RED_LIGHT = "#ef8f7f";
const FIRE_IVORY = "#fbf4e6";
const FIRE_IVORY_SHADE = "#e6d8bf";
const FIRE_IVORY_EDGE = "#c9b99e";
const FIRE_GLOW = "#ffe2ad";

/** Cream house with a brick-red roof, a red door, and an amber alarm lamp in the gable: where the power starts. */
function FireHouseSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill={FIRE_IVORY} />
      <path d="M14.5 30.5 32 17" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke={FIRE_IVORY_EDGE} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="#5c2a22" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="#a5402f" strokeWidth="8.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6 28.6 32 10.1" fill="none" stroke="#dd8a74" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <circle cx="32" cy="26.5" r="4.4" fill="#7e2f22" />
      <circle cx="32" cy="26.5" r="3.3" fill="#ffb020" />
      <circle cx="31" cy="25.5" r="1.1" fill="#fff1c9" />
      <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill="#a5402f" />
      <path d="M19.2 43.4a3.8 3.8 0 0 1 3.8-3.6" fill="none" stroke="#dd8a74" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="25.6" cy="48.6" r="1.2" fill="#f0cf86" />
      <rect x="35" y="35.5" width="12.5" height="11.5" rx="2.6" fill="#f3e6cf" stroke={FIRE_IVORY_EDGE} strokeWidth="1.2" />
      <path d="M41.25 36.5v9.5M36 41.25h10.5" stroke={FIRE_IVORY_EDGE} strokeWidth="1.6" />
    </svg>
  );
}

/** Ivory ceiling detector with a red accent ring and a vented dome. */
function FireDetector({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 56" className={on ? "pc-glyph pc-badge is-on" : "pc-glyph pc-badge"}>
      <circle cx="28" cy="28" r="23" fill={FIRE_IVORY} stroke={FIRE_IVORY_EDGE} strokeWidth="1.1" />
      <path d="M48 36A21.6 21.6 0 0 1 14 46.4 23 23 0 0 0 48.6 24c.6 4 .4 8-.6 12z" fill={FIRE_IVORY_SHADE} />
      <circle cx="28" cy="28" r="17" fill="none" stroke={FIRE_RED} strokeWidth="3" />
      <circle cx="28" cy="28" r="13" fill={on ? FIRE_GLOW : "#f6ecdb"} />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M28 16.6v3.6"
          stroke={on ? "#f3b866" : FIRE_IVORY_EDGE}
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 28 28)`}
        />
      ))}
      <circle cx="28" cy="28" r="6.4" fill={on ? "#fff7e6" : "white"} stroke={on ? "#ffc070" : FIRE_IVORY_EDGE} strokeWidth="1" />
      <circle cx="36.5" cy="36.5" r="1.9" fill={on ? "#ff7a5a" : FIRE_RED_DARK} />
      <path d="M11.6 21A17.6 17.6 0 0 1 23 10.8" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** Red alarm bell on an ivory wall plate with a brass striker. */
function FireBell({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 56" className={on ? "pc-glyph pc-badge is-on" : "pc-glyph pc-badge"}>
      <circle cx="28" cy="28" r="23" fill={FIRE_IVORY} stroke={FIRE_IVORY_EDGE} strokeWidth="1.1" />
      <path d="M48 36A21.6 21.6 0 0 1 14 46.4 23 23 0 0 0 48.6 24c.6 4 .4 8-.6 12z" fill={FIRE_IVORY_SHADE} />
      {[
        [28, 8.6],
        [28, 47.4],
      ].map(([cx, cy]) => (
        <circle key={cy} cx={cx} cy={cy} r="1.7" fill={FIRE_IVORY_EDGE} />
      ))}
      <circle cx="28" cy="27" r="15.6" fill={FIRE_RED_DARK} />
      <circle cx="27.4" cy="26.2" r="14.4" fill={FIRE_RED} />
      <path d="M16.4 22.4A12 12 0 0 1 26 13.4" fill="none" stroke={on ? FIRE_GLOW : FIRE_RED_LIGHT} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="27.4" cy="26.2" r="3.4" fill="#c9953f" />
      <circle cx="26.6" cy="25.4" r="1.2" fill="#f0cf86" />
      <path d="M28 42.6v4" stroke="#9a6c28" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="28" cy="42.4" r="2.6" fill="#c9953f" />
      {on && <circle cx="27.4" cy="26.2" r="9" fill="none" stroke={FIRE_GLOW} strokeWidth="1.2" opacity="0.7" />}
    </svg>
  );
}

function FireMark() {
  return (
    <svg viewBox="0 0 80 72" className="pc-mark-icon">
      <circle cx="40" cy="36" r="30" fill={FIRE_IVORY} stroke={FIRE_IVORY_EDGE} strokeWidth="1.6" />
      <circle cx="40" cy="35" r="20" fill={FIRE_RED_DARK} />
      <circle cx="39" cy="34" r="18.6" fill={FIRE_RED} />
      <path d="M25 29a16 16 0 0 1 12-11" fill="none" stroke={FIRE_RED_LIGHT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="39" cy="34" r="4.4" fill="#c9953f" />
    </svg>
  );
}

/** Every theme runs the same slim conduit. */
const PIPE_GAUGE = 0.7;
const IVORY = "#fbf6ec";
const IVORY_SHADE = "#e6dac6";
const IVORY_EDGE = "#c9b99e";
const BRASS = "#c9953f";
const BRASS_DARK = "#9a6c28";
const BRASS_LIGHT = "#f0cf86";
const WATER = "#8fd3df";

const BRONZE = "#b07a3e";
const BRONZE_DARK = "#7a4f24";
const BRONZE_LIGHT = "#e8bf86";
const PA_GLOW = "#ffe2ad";

/** Cream house with a deep teal roof, a copper door, and a round speaker grille in the gable. */
function PaHouseSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <path d="M12 29 32 13.5 52 29v18.5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V29z" fill={IVORY} />
      <path d="M14.5 30.5 32 17" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M13 48.5a6.5 6.5 0 0 0 6 5h26a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke={IVORY_EDGE} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      <path d="M8.5 33 32 15 55.5 33" fill="none" stroke="#233f3c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <path d="M8 30.5 32 11.5l24 19" fill="none" stroke="#3f6f6a" strokeWidth="8.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.6 28.6 32 10.1" fill="none" stroke="#8fb8b1" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <circle cx="32" cy="26.5" r="4.4" fill={BRONZE_DARK} />
      <circle cx="32" cy="26.5" r="3.3" fill={BRONZE} />
      <path d="M29.8 25.4h4.4M29.4 27h5.2M29.8 28.6h4.4" stroke={BRONZE_DARK} strokeWidth="0.7" strokeLinecap="round" />
      <path d="M17.5 54.5V43.5a5.5 5.5 0 0 1 11 0v11z" fill={BRONZE} />
      <path d="M19.2 43.4a3.8 3.8 0 0 1 3.8-3.6" fill="none" stroke={BRONZE_LIGHT} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="25.6" cy="48.6" r="1.2" fill={BRONZE_LIGHT} />
      <rect x="35" y="35.5" width="12.5" height="11.5" rx="2.6" fill="#f3e6cf" stroke={IVORY_EDGE} strokeWidth="1.2" />
      <path d="M41.25 36.5v9.5M36 41.25h10.5" stroke={IVORY_EDGE} strokeWidth="1.6" />
    </svg>
  );
}

function svgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Bronze 1950s bull horn: a rounded, bulging bell with a wide round mouth and rolled rim, held in a yoke on a short post. */
function Horn({ on }: { on: boolean }) {
  const id = svgId(useId());
  return (
    <svg viewBox="0 0 64 56" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2b27a" />
          <stop offset="0.45" stopColor={BRONZE} />
          <stop offset="1" stopColor={BRONZE_DARK} />
        </linearGradient>
        <radialGradient id={`${id}m`} cx="0.42" cy="0.5" r="0.6">
          <stop offset="0" stopColor={on ? "#fff6de" : "#2e1c0c"} />
          <stop offset="0.45" stopColor={on ? PA_GLOW : "#5a3818"} />
          <stop offset="1" stopColor={on ? "#e8b46a" : "#8a5a2c"} />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e8c08c" />
          <stop offset="1" stopColor={BRONZE_DARK} />
        </radialGradient>
      </defs>
      <ellipse cx="22" cy="51.4" rx="12.6" ry="3.6" fill={BRONZE_DARK} />
      <ellipse cx="22" cy="50" rx="10.6" ry="2.8" fill={`url(#${id}b)`} />
      <rect x="19.6" y="36" width="4.8" height="14" rx="2" fill={BRONZE_DARK} />
      <path d="M20.8 37.4v11" stroke={BRONZE_LIGHT} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <path d="M14.6 27.6v6.4a3 3 0 0 0 3 3h8.8a3 3 0 0 0 3-3v-6.4" fill="none" stroke={BRONZE_DARK} strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="9.6" cy="27.4" rx="6.4" ry="7.8" fill={`url(#${id}d)`} />
      <path d="M6.4 23c1-1.8 2.6-2.8 4.4-3" fill="none" stroke={BRONZE_LIGHT} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 23.4C21 22.8 26 18.6 29.6 9.6 31.4 5.6 34 4.2 37.6 4.6L41.8 46.4C38.2 47 35.4 45.6 33.4 42 29 34.8 22 31.8 13 31.4z" fill={`url(#${id}b)`} />
      <path d="M14.6 25.2C21.4 24.6 26 21 29 14.2" fill="none" stroke="#f3d3a6" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <g transform="rotate(-6 39.6 25.5)">
        <ellipse cx="39.6" cy="25.5" rx="14" ry="21" fill={BRONZE_DARK} />
        <ellipse cx="39.6" cy="25.5" rx="12.8" ry="19.8" fill={`url(#${id}b)`} />
        <ellipse cx="40.2" cy="25.7" rx="10.4" ry="17" fill={`url(#${id}m)`} />
        <ellipse cx="37.6" cy="26" rx="3" ry="5.4" fill={on ? "#fffaf0" : "#24160a"} />
        <path d="M28.4 18.4A12.8 19.8 0 0 1 38 5.8" fill="none" stroke="#f3d3a6" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Bronze 1950s broadcast microphone with a ribbed grille on a short stand. */
function Microphone({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 56" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <ellipse cx="32" cy="51" rx="14" ry="3.6" fill={BRONZE_DARK} />
      <ellipse cx="32" cy="49.6" rx="12" ry="2.6" fill={BRONZE} />
      <rect x="30" y="34" width="4" height="15" rx="2" fill={BRONZE_DARK} />
      <path d="M19 20v6a13 10 0 0 0 26 0v-6" fill="none" stroke={BRONZE_DARK} strokeWidth="3" strokeLinecap="round" />
      <rect x="21" y="4" width="22" height="32" rx="11" fill={BRONZE} />
      <path d="M43 15v10a11 11 0 0 1-11 11 11 11 0 0 0 8-10.6V15a11 11 0 0 0-8-10.6A11 11 0 0 1 43 15z" fill={BRONZE_DARK} opacity="0.35" />
      {[10, 14, 18, 22, 26, 30].map((y) => (
        <path key={y} d={`M24 ${y}h16`} stroke={on ? PA_GLOW : BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" opacity={on ? 0.9 : 0.55} />
      ))}
      <path d="M32 5v30" stroke={BRONZE_DARK} strokeWidth="1.2" opacity="0.5" />
      <path d="M25 10c0-2.6 1.6-4.6 4-5.4" fill="none" stroke={BRONZE_LIGHT} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Bronze tabletop radio with a cloth grille, an ivory dial, and two knobs. */
function Radio({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 56" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <rect x="10" y="46" width="6" height="5" rx="1.6" fill={BRONZE_DARK} />
      <rect x="48" y="46" width="6" height="5" rx="1.6" fill={BRONZE_DARK} />
      <rect x="5" y="9" width="54" height="39" rx="10" fill={BRONZE} />
      <path d="M59 19v19a10 10 0 0 1-10 10H15a10 10 0 0 0 9-6h25a4 4 0 0 0 4-4V9.6A10 10 0 0 1 59 19z" fill={BRONZE_DARK} opacity="0.35" />
      <path d="M12 11.6h40" stroke={BRONZE_LIGHT} strokeWidth="2" strokeLinecap="round" />
      <rect x="11" y="16" width="24" height="26" rx="6" fill="#e7d6b4" stroke={BRONZE_DARK} strokeWidth="1.2" />
      {[16, 21, 26, 31].map((x) => (
        <path key={x} d={`M${x} 19v20`} stroke="#c9b48c" strokeWidth="1.6" strokeLinecap="round" />
      ))}
      <circle cx="47" cy="24" r="7.4" fill={on ? PA_GLOW : IVORY} stroke={IVORY_EDGE} strokeWidth="1.2" />
      <path d="M47 24l3.6-4" stroke={BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" />
      {[42, 52].map((x) => (
        <g key={x}>
          <circle cx={x} cy="38" r="3.4" fill={IVORY} stroke={IVORY_EDGE} strokeWidth="1" />
          <circle cx={x - 0.8} cy="37.2" r="1" fill="white" />
        </g>
      ))}
    </svg>
  );
}

const PHONE_IVORY = "#f8efdb";
const PHONE_SHADE = "#dcc8a2";
const PHONE_EDGE = "#a98f66";

/** Full ivory-cream 1950s rotary desk telephone: a deep two-step body, a large finger-wheel dial, a raised handset, and a coiled cord. */
function Telephone({ on }: { on: boolean }) {
  const id = svgId(useId());
  return (
    <svg viewBox="0 0 64 56" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.55" stopColor={PHONE_IVORY} />
          <stop offset="1" stopColor={PHONE_SHADE} />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.6" stopColor={PHONE_IVORY} />
          <stop offset="1" stopColor={PHONE_SHADE} />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="#efe2c6" />
        </radialGradient>
      </defs>
      <path d="M5.6 44.4h52.8v2.8a4.4 4.4 0 0 1-4.4 4.4H10a4.4 4.4 0 0 1-4.4-4.4z" fill={PHONE_SHADE} stroke={PHONE_EDGE} strokeWidth="1" />
      <path d="M7.6 43.6C7.6 33 12 25 19.4 20.6h25.2C52 25 56.4 33 56.4 43.6a2.6 2.6 0 0 1-2.6 2.6H10.2a2.6 2.6 0 0 1-2.6-2.6z" fill={`url(#${id}b)`} stroke={PHONE_EDGE} strokeWidth="1.1" />
      <path d="M18.8 24.6c-4 3.6-6.6 9-7.4 15.6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <ellipse cx="32" cy="21.6" rx="13.6" ry="2" fill={PHONE_EDGE} opacity="0.35" />
      <circle cx="32" cy="34.4" r="11.4" fill={PHONE_SHADE} stroke={PHONE_EDGE} strokeWidth="1.1" />
      <circle cx="32" cy="34" r="10" fill={`url(#${id}d)`} stroke={PHONE_EDGE} strokeWidth="0.7" />
      {Array.from({ length: 10 }, (_, i) => {
        const angle = ((i * 27 - 72) * Math.PI) / 180;
        const x = 32 + Math.cos(angle) * 6.9;
        const y = 34 + Math.sin(angle) * 6.9;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="1.9" fill="#cdb48a" stroke={PHONE_EDGE} strokeWidth="0.7" />
            <circle cx={x + 0.4} cy={y + 0.5} r="1" fill="#b39a70" />
          </g>
        );
      })}
      <circle cx="32" cy="34" r="3.6" fill={on ? PA_GLOW : PHONE_IVORY} stroke={PHONE_EDGE} strokeWidth="0.9" />
      <circle cx="31" cy="33" r="1.1" fill="white" />
      <path d="M40.2 40.4l3 2.6" stroke={BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.4 21.6 18.6 14.4h26.8l2.2 7.2z" fill={`url(#${id}h)`} stroke={PHONE_EDGE} strokeWidth="1" strokeLinejoin="round" />
      <path d="M20 16.4h24" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      {[20, 44].map((x) => (
        <path key={x} d={`M${x - 4} 18v-3.6a2.6 2.6 0 0 1 2.6-2.6h2.8a2.6 2.6 0 0 1 2.6 2.6v3.6z`} fill={PHONE_SHADE} stroke={PHONE_EDGE} strokeWidth="0.9" />
      ))}
      <ellipse cx="32" cy="16.4" rx="20" ry="2.4" fill={PHONE_EDGE} opacity="0.3" />
      <path d="M15 12.4h34" stroke={PHONE_EDGE} strokeWidth="9.6" strokeLinecap="round" />
      <path d="M15 12.4h34" stroke={`url(#${id}h)`} strokeWidth="7.8" strokeLinecap="round" />
      <path d="M16.6 9.6h30.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.95" />
      {[11.2, 52.8].map((x) => (
        <g key={x}>
          <path d={`M${x - 7.6} 12.8a7.6 6 0 0 1 15.2 0v4.6a7.6 4.8 0 0 1-15.2 0z`} fill={`url(#${id}h)`} stroke={PHONE_EDGE} strokeWidth="1.1" />
          <ellipse cx={x} cy="18.2" rx="6.2" ry="2.4" fill={PHONE_SHADE} stroke={PHONE_EDGE} strokeWidth="0.6" />
          <path d={`M${x - 5} 11.4a5.6 3.4 0 0 1 7.2-2.6`} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
        </g>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={i} cx="3.8" cy={23.6 + i * 3.1} rx="2.4" ry="1.5" fill="none" stroke={PHONE_EDGE} strokeWidth="1.3" />
      ))}
      <path d="M4.6 45.2c1 .6 1.8.6 2.8.2" fill="none" stroke={PHONE_EDGE} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HornMark() {
  return (
    <svg viewBox="0 0 80 72" className="pc-mark-icon">
      <rect x="8" y="26" width="8" height="22" rx="3" fill={BRONZE_DARK} />
      <rect x="14" y="28" width="16" height="18" rx="5" fill={BRONZE} />
      <path d="M28 30 62 12c5 8 7 16 7 24s-2 16-7 24L28 42z" fill={BRONZE} />
      <path d="M31 31 59 16" stroke={BRONZE_LIGHT} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="63" cy="36" rx="6" ry="24" fill={BRONZE_DARK} />
    </svg>
  );
}


/** Cream cottage with a terracotta tile roof, a chimney, and a lit round window. */
function MainSource() {
  return (
    <svg viewBox="0 0 64 60" className="pc-source-icon">
      <rect x="40" y="6" width="8" height="15" rx="1.6" fill="#eadfca" />
      <rect x="39" y="4.5" width="10" height="3.6" rx="1.4" fill="#d8c9ae" />
      <path d="M41 9.5v9" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M13 29 32 14.5 51 29v19a7 7 0 0 1-7 7H20a7 7 0 0 1-7-7V29z" fill="#f4ead6" />
      <path d="M15.5 30.5 32 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <path d="M14 49a6.5 6.5 0 0 0 6 5.2h24a6.5 6.5 0 0 0 6.2-6V30" fill="none" stroke="#bda57f" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
      <path d="M8.5 33.5 32 15.5 55.5 33.5" fill="none" stroke="#7d3b22" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.26" />
      <path d="M8 31 32 12l24 19" fill="none" stroke="#bf5f3c" strokeWidth="9.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 27.2 32 12M51.4 27.2 32 12" fill="none" stroke="#9f4a2c" strokeWidth="1.1" strokeDasharray="2.2 2.6" opacity="0.75" />
      <path d="M8.7 29 32 10.6" fill="none" stroke="#e08a64" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <path d="M26 55V45.5a6 6 0 0 1 12 0V55z" fill="#a8754e" />
      <path d="M28 45.4a4 4 0 0 1 4-3.9" fill="none" stroke="#cc9d74" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="32" cy="33.5" r="5.2" fill="#ffe7a6" stroke="#d6b98a" strokeWidth="1.4" />
      <circle cx="32" cy="33.5" r="2.8" fill="#fff6d8" />
      <circle cx="30.6" cy="32.1" r="1" fill="white" />
    </svg>
  );
}

function FaucetMark() {
  return (
    <svg viewBox="0 0 80 72" className="pc-mark-icon">
      <path d="M22 30V22a10 10 0 0 1 10-10h18a8 8 0 0 1 8 8v6" fill="none" stroke={BRASS_DARK} strokeWidth="9" strokeLinecap="round" />
      <path d="M22 30V22a10 10 0 0 1 10-10h18a8 8 0 0 1 8 8v6" fill="none" stroke={BRASS} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M24 26v-4a8 8 0 0 1 8-8h16" fill="none" stroke={BRASS_LIGHT} strokeWidth="2" strokeLinecap="round" />
      <rect x="30" y="4" width="16" height="6" rx="3" fill={BRASS} />
      <path d="M58 34c0 0-7 9-7 14a7 7 0 0 0 14 0c0-5-7-14-7-14z" fill={WATER} />
      <path d="M55.5 46a3 3 0 0 0 2.5 3.6" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="10" y="56" width="60" height="8" rx="4" fill="#a8b993" />
    </svg>
  );
}

function Tub({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 56" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      {[15, 49].map((x) => (
        <g key={x}>
          <path d={`M${x - 3} 42q-2.4 5 -1.4 9.4h4.6q-0.4-3.6 2.2-6.6z`} fill={BRASS_DARK} transform={x > 32 ? `translate(${2 * x} 0) scale(-1 1)` : undefined} />
          <path d={`M${x - 2.4} 43q-1.6 4 -1 7.2`} fill="none" stroke={BRASS_LIGHT} strokeWidth="1.1" strokeLinecap="round" transform={x > 32 ? `translate(${2 * x} 0) scale(-1 1)` : undefined} />
        </g>
      ))}
      <path d="M7 22h50c0 13-5 23-25 23S7 35 7 22z" fill={IVORY} />
      <path d="M57 22c0 13-5 23-25 23-9 0-15-2-18.6-5.6C18 42 23 42.6 30 42.6c17 0 23-8 23.4-20.6z" fill={IVORY_SHADE} />
      <path d="M11 26c1 7 5 12 12 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      <rect x="4.5" y="18" width="55" height="6" rx="3" fill="white" stroke={IVORY_EDGE} strokeWidth="1.1" />
      {on && (
        <>
          <rect x="9" y="18.8" width="46" height="2.8" rx="1.4" fill={WATER} />
          <path d="M16 19.9h9" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
      <path d="M12 18.5v-6.5a4 4 0 0 1 4-4h4.5" fill="none" stroke={BRASS_DARK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M12 18.5v-6.5a4 4 0 0 1 4-4h4.5" fill="none" stroke={BRASS} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20.5 8v3" stroke={BRASS} strokeWidth="2.2" strokeLinecap="round" />
      {[8.6, 15.4].map((x) => (
        <circle key={x} cx={x} cy="14.5" r="1.9" fill={BRASS} stroke={BRASS_DARK} strokeWidth="0.8" />
      ))}
      {on && <path d="M20.5 12v5" stroke={WATER} strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function Toilet({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 60" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <rect x="15" y="6" width="26" height="20" rx="4" fill={IVORY} stroke={IVORY_EDGE} strokeWidth="1" />
      <path d="M36 8.5v15" stroke={IVORY_SHADE} strokeWidth="4" strokeLinecap="round" />
      <path d="M18.5 10v11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="13" y="3" width="30" height="5.4" rx="2.7" fill="white" stroke={IVORY_EDGE} strokeWidth="1" />
      <rect x="17" y="11" width="6" height="2.6" rx="1.3" fill={BRASS} stroke={BRASS_DARK} strokeWidth="0.6" />
      <path d="M21 40h14l2 12a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3z" fill={IVORY_SHADE} />
      <path d="M22.5 42l-1 10" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <rect x="17" y="53.5" width="22" height="4" rx="2" fill={IVORY_EDGE} />
      <path d="M10 31c0 8 7 13 18 13s18-5 18-13z" fill={IVORY} />
      <path d="M46 31c0 8-7 13-18 13-4 0-7.5-.6-10.2-1.8 2.4.4 4.8.6 7.2.6 10.6 0 17-4.4 17.6-11.8z" fill={IVORY_SHADE} />
      <ellipse cx="28" cy="30.5" rx="18.5" ry="5.6" fill="white" stroke={IVORY_EDGE} strokeWidth="1.1" />
      <ellipse cx="28" cy="30.6" rx="12" ry="3.2" fill={on ? WATER : IVORY_SHADE} />
      {on && <path d="M21.5 30h5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />}
    </svg>
  );
}

function Sink({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 56 60" className={on ? "pc-glyph pc-fixture is-on" : "pc-glyph pc-fixture"}>
      <path d="M22 32c1.4 8 .8 15-2.6 22h17.2c-3.4-7-4-14-2.6-22z" fill={IVORY} />
      <path d="M34 32c-1.4 8-.8 15 2.6 22h-4.2c-2.6-7-3-14-2-22z" fill={IVORY_SHADE} />
      <path d="M24.4 35c.6 6 .2 11-1.6 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <ellipse cx="28" cy="55" rx="11" ry="2.6" fill={IVORY_EDGE} />
      <path d="M6 19h44c0 8.6-7.6 15-22 15S6 27.6 6 19z" fill={IVORY} />
      <path d="M50 19c0 8.6-7.6 15-22 15-5 0-9.2-.8-12.4-2.2 2.6.4 5.4.6 8.4.6 13.6 0 21.6-5.6 22-13.4z" fill={IVORY_SHADE} />
      <path d="M10 22.5c1.6 4.6 6 7.6 12 8.8" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="15.5" width="48" height="6" rx="3" fill="white" stroke={IVORY_EDGE} strokeWidth="1.1" />
      <ellipse cx="28" cy="18.4" rx="17" ry="1.9" fill={on ? WATER : IVORY_SHADE} />
      <path d="M28 16V8.6a3.4 3.4 0 0 1 3.4-3.4H35v3.2" fill="none" stroke={BRASS_DARK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M28 16V8.6a3.4 3.4 0 0 1 3.4-3.4H35v3.2" fill="none" stroke={BRASS} strokeWidth="2.2" strokeLinecap="round" />
      {[19, 37].map((x) => (
        <g key={x}>
          <path d={`M${x} 15.6v-3.4`} stroke={BRASS_DARK} strokeWidth="2.4" strokeLinecap="round" />
          <path d={`M${x - 2.6} 11.4h5.2`} stroke={BRASS} strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {on && <path d="M35 9.4v6" stroke={WATER} strokeWidth="1.6" strokeLinecap="round" />}
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
