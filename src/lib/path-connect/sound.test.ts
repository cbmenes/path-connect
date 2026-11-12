import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { WIN_SOUND_LIMIT, scheduleWinSound } from "./sound.ts";
import type { ThemeId } from "./styles.ts";

/** Records what a sound schedules, without making any noise. */
function recorder() {
  const stops: number[] = [];
  const gains: number[] = [];
  const voices: string[] = [];
  const param = (track?: number[]) => {
    const keep = (value: number) => {
      track?.push(value);
    };
    return {
      value: 0,
      setValueAtTime: keep,
      linearRampToValueAtTime: keep,
      exponentialRampToValueAtTime: keep,
    };
  };
  const node = () => ({ connect() {} });
  const ctx = {
    sampleRate: 8000,
    createOscillator: () => {
      const frequency = param();
      const osc = {
        ...node(),
        type: "sine",
        frequency,
        start() {},
        stop: (at: number) => {
          stops.push(at);
          voices.push(osc.type);
        },
      };
      return osc;
    },
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      start() {},
      stop: (at: number) => {
        stops.push(at);
        voices.push("noise");
      },
    }),
    createGain: () => ({ ...node(), gain: param(gains) }),
    createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: param(), Q: param() }),
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
  };
  return { ctx: ctx as unknown as BaseAudioContext, stops, gains, voices };
}

const THEMES: ThemeId[] = ["lights", "plumbing", "fire", "alarm"];

describe("completion sounds", () => {
  test("each theme finishes in under a second and a half", () => {
    for (const theme of THEMES) {
      const { ctx, stops } = recorder();
      const start = 10;
      const end = scheduleWinSound(ctx, {} as AudioNode, theme, start);
      assert.ok(stops.length > 0, `${theme} schedules no sound`);
      assert.ok(end - start < WIN_SOUND_LIMIT, `${theme} ends at ${end - start}s`);
      for (const stop of stops) assert.ok(stop - start < WIN_SOUND_LIMIT, `${theme} voice stops at ${stop - start}s`);
    }
  });

  // Filtered noise loses most of its level in the filter, so its envelope can sit higher than a tone's.
  test("stays soft", () => {
    for (const theme of THEMES) {
      const { ctx, gains } = recorder();
      scheduleWinSound(ctx, {} as AudioNode, theme, 0);
      assert.ok(Math.max(...gains) <= 0.15, `${theme} peaks at ${Math.max(...gains)}`);
    }
  });

  test("gives every theme its own sound", () => {
    const shapes = THEMES.map((theme) => {
      const { ctx, stops, voices } = recorder();
      scheduleWinSound(ctx, {} as AudioNode, theme, 0);
      return `${voices.join(",")}|${stops.map((stop) => stop.toFixed(3)).join(",")}`;
    });
    assert.equal(new Set(shapes).size, THEMES.length);
  });
});
