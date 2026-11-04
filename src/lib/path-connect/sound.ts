/** Short tones for a turn and a cleared board. Silent if audio is unavailable. */

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

export function playWin(muted: boolean) {
  if (muted) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, 523, now, 0.12, 0.04);
    tone(ctx, 659, now + 0.08, 0.14, 0.04);
    tone(ctx, 784, now + 0.16, 0.22, 0.045);
  } catch {
    // Missing audio should not block the win state.
  }
}
