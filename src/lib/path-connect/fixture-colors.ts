/**
 * Plumbing fixtures and PA telephones come in four 1950s pastels. Each board
 * gets its own mix, seeded by the level id so every player sees the same
 * colors on the same board. Colors are dealt from shuffled rounds of all four,
 * so no color is used more than once more than any other, and two fixtures in
 * a row never repeat a color across a round.
 */
export const FIXTURE_COLORS = ["ivory", "aqua", "yellow", "pink"] as const;
export const PHONE_COLORS = ["ivory", "pink", "sage", "yellow"] as const;

export type FixtureColor = (typeof FIXTURE_COLORS)[number];
export type PhoneColor = (typeof PHONE_COLORS)[number];

function random(seed: number): () => number {
  let state = (seed ^ 0x5f3759df) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deal<T>(palette: readonly T[], seed: number, count: number): T[] {
  const rand = random(seed);
  const colors: T[] = [];
  while (colors.length < count) {
    const round = [...palette];
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [round[i], round[j]] = [round[j]!, round[i]!];
    }
    const last = round.length - 1;
    if (round[0] === colors.at(-1)) [round[0], round[last]] = [round[last]!, round[0]!];
    colors.push(...round);
  }
  return colors.slice(0, count);
}

export function fixtureColors(levelId: number, count: number): FixtureColor[] {
  return deal(FIXTURE_COLORS, Math.imul(levelId, 2654435761), count);
}

export function phoneColors(levelId: number, count: number): PhoneColor[] {
  return deal(PHONE_COLORS, Math.imul(levelId, 2246822519) ^ 0x7e1e, count);
}
