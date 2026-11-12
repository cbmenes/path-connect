/** Short tones for a turn and a cleared board. Silent if audio is unavailable. */

import type { ThemeId } from "./styles.ts";

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(ctx: AudioContext, frequency: number, when: number, duration: number, gain: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, when);
  amp.gain.setValueAtTime(gain, when);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

export function playTurn(muted: boolean) {
  if (muted) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    tone(ctx, 440, ctx.currentTime, 0.045, 0.03);
  } catch {
    // Missing audio should not block a turn.
  }
}

/** Every completion sound is scheduled to finish inside this many seconds. */
export const WIN_SOUND_LIMIT = 1.5;

const SILENT = 0.0001;
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2f6b1d;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 0x80000000 - 1;
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

/** A struck or plucked voice: quick rise, then an exponential fade. */
function ping(
  ctx: BaseAudioContext,
  out: AudioNode,
  opts: { type?: OscillatorType; freq: number; at: number; peak: number; decay: number; attack?: number; glideTo?: number; glide?: number },
): number {
  const attack = opts.attack ?? 0.008;
  const end = opts.at + attack + opts.decay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, opts.at);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, opts.at + (opts.glide ?? 0.05));
  amp.gain.setValueAtTime(SILENT, opts.at);
  amp.gain.exponentialRampToValueAtTime(opts.peak, opts.at + attack);
  amp.gain.exponentialRampToValueAtTime(SILENT, end);
  osc.connect(amp);
  amp.connect(out);
  osc.start(opts.at);
  osc.stop(end + 0.01);
  return end + 0.01;
}

/** Filtered noise with its own envelope and an optional filter sweep. */
function hiss(
  ctx: BaseAudioContext,
  out: AudioNode,
  opts: {
    at: number;
    length: number;
    peak: number;
    filter: BiquadFilterType;
    freq: number;
    sweepTo?: number;
    q?: number;
    attack?: number;
  },
): number {
  const end = opts.at + opts.length;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter;
  filter.Q.value = opts.q ?? 0.8;
  filter.frequency.setValueAtTime(opts.freq, opts.at);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, opts.at + opts.length * 0.6);
  const amp = ctx.createGain();
  const attack = opts.attack ?? 0.004;
  amp.gain.setValueAtTime(SILENT, opts.at);
  amp.gain.exponentialRampToValueAtTime(opts.peak, opts.at + attack);
  amp.gain.exponentialRampToValueAtTime(SILENT, end);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  src.start(opts.at);
  src.stop(end + 0.01);
  return end + 0.01;
}

/** A small switch or button click: a tick of noise over a soft low thump. */
function click(ctx: BaseAudioContext, out: AudioNode, at: number, peak: number): number {
  const a = hiss(ctx, out, { at, length: 0.03, peak, filter: "highpass", freq: 1800 });
  const b = ping(ctx, out, { freq: 150, glideTo: 90, glide: 0.04, at, peak: peak * 0.8, decay: 0.05, attack: 0.003 });
  return Math.max(a, b);
}

/** Lights flicker on a mains buzz, click on, and settle into a warm hum. */
function lightsWin(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.setValueAtTime(120, t);
  const warm = ctx.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 650;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  const flickers: [number, number, number][] = [
    [0, 0.05, 0.016],
    [0.085, 0.035, 0.01],
    [0.15, 0.07, 0.018],
  ];
  for (const [start, length, level] of flickers) {
    amp.gain.setValueAtTime(0, t + start);
    amp.gain.linearRampToValueAtTime(level, t + start + 0.008);
    amp.gain.setValueAtTime(level, t + start + length - 0.01);
    amp.gain.linearRampToValueAtTime(0, t + start + length);
  }
  buzz.connect(warm);
  warm.connect(amp);
  amp.connect(out);
  buzz.start(t);
  buzz.stop(t + 0.24);

  const on = t + 0.23;
  let end = click(ctx, out, on, 0.035);
  end = Math.max(end, ping(ctx, out, { freq: 220, at: on + 0.02, peak: 0.03, decay: 0.85, attack: 0.07 }));
  end = Math.max(end, ping(ctx, out, { freq: 330, at: on + 0.02, peak: 0.012, decay: 0.7, attack: 0.07 }));
  end = Math.max(end, ping(ctx, out, { type: "triangle", freq: 440, at: on + 0.03, peak: 0.008, decay: 0.55, attack: 0.05 }));
  return end;
}

/** A valve opens and clean water starts to run, with a few soft bubbles. */
function plumbingWin(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  let end = click(ctx, out, t, 0.02);
  end = Math.max(
    end,
    hiss(ctx, out, { at: t + 0.04, length: 1.05, peak: 0.13, filter: "bandpass", freq: 420, sweepTo: 1300, q: 1.1, attack: 0.18 }),
  );
  end = Math.max(
    end,
    hiss(ctx, out, { at: t + 0.1, length: 0.9, peak: 0.045, filter: "lowpass", freq: 380, attack: 0.2 }),
  );
  const bubbles: [number, number][] = [
    [0.16, 560],
    [0.3, 700],
    [0.43, 620],
    [0.58, 820],
    [0.72, 680],
  ];
  for (const [at, freq] of bubbles) {
    end = Math.max(end, ping(ctx, out, { freq, glideTo: freq * 1.6, glide: 0.05, at: t + at, peak: 0.02, decay: 0.07, attack: 0.006 }));
  }
  return end;
}

/** A pull-station click, then two restrained strokes of a small brass bell. */
function bell(ctx: BaseAudioContext, out: AudioNode, at: number, base: number, peak: number, decay: number): number {
  const partials: [number, number, number][] = [
    [1, 1, 1],
    [2, 0.32, 0.6],
    [2.76, 0.22, 0.45],
    [5.4, 0.08, 0.25],
  ];
  let end = at;
  for (const [ratio, level, length] of partials) {
    end = Math.max(end, ping(ctx, out, { freq: base * ratio, at, peak: peak * level, decay: decay * length, attack: 0.004 }));
  }
  return end;
}

function fireWin(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  let end = click(ctx, out, t, 0.03);
  end = Math.max(end, click(ctx, out, t + 0.055, 0.018));
  end = Math.max(end, bell(ctx, out, t + 0.16, 880, 0.026, 0.55));
  end = Math.max(end, bell(ctx, out, t + 0.36, 880, 0.032, 0.95));
  return end;
}

/** A mic switch, a brief turn of the radio dial, then a clear two-note chime. */
function announceWin(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  let end = click(ctx, out, t, 0.032);
  end = Math.max(
    end,
    hiss(ctx, out, { at: t + 0.06, length: 0.2, peak: 0.014, filter: "bandpass", freq: 2600, sweepTo: 1100, q: 2.2, attack: 0.03 }),
  );
  end = Math.max(
    end,
    ping(ctx, out, { freq: 1700, glideTo: 950, glide: 0.18, at: t + 0.07, peak: 0.004, decay: 0.18, attack: 0.03 }),
  );
  end = Math.max(end, ping(ctx, out, { freq: 659.25, at: t + 0.3, peak: 0.034, decay: 0.42, attack: 0.01 }));
  end = Math.max(end, ping(ctx, out, { type: "triangle", freq: 1318.5, at: t + 0.3, peak: 0.006, decay: 0.25 }));
  end = Math.max(end, ping(ctx, out, { freq: 880, at: t + 0.52, peak: 0.034, decay: 0.68, attack: 0.01 }));
  end = Math.max(end, ping(ctx, out, { type: "triangle", freq: 1760, at: t + 0.52, peak: 0.006, decay: 0.35 }));
  return end;
}

const WIN_SOUNDS: Record<ThemeId, (ctx: BaseAudioContext, out: AudioNode, t: number) => number> = {
  lights: lightsWin,
  plumbing: plumbingWin,
  fire: fireWin,
  alarm: announceWin,
};

/**
 * Schedules the theme's completion sound into `destination` and returns the
 * time the last voice stops. Everything passes a gentle low-pass, so the
 * sounds stay soft and warm, like an old radio speaker.
 */
export function scheduleWinSound(ctx: BaseAudioContext, destination: AudioNode, theme: ThemeId, when: number): number {
  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 4200;
  warmth.Q.value = 0.5;
  warmth.connect(destination);
  return WIN_SOUNDS[theme](ctx, warmth, when);
}

export function playWin(muted: boolean, theme: ThemeId) {
  if (muted) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    scheduleWinSound(ctx, ctx.destination, theme, ctx.currentTime);
  } catch {
    // Missing audio should not block the win state.
  }
}
