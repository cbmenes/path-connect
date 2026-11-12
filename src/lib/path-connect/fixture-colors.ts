/**
 * Plumbing fixtures come in four 1950s pastels. Each board gets its own mix,
 * seeded by the level id so every player sees the same colors on the same
 * board. Colors are dealt from shuffled rounds of all four, so no color is
 * used more than once more than any other, and two fixtures in a row never
 * repeat a color across a round.
 */
export const FIXTURE_COLORS = ["ivory", "aqua", "yellow", "pink"] as const;

export type FixtureColor = (typeof FIXTURE_COLORS)[number];

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

export function fixtureColors(levelId: number, count: number): FixtureColor[] {
  const rand = random(Math.imul(levelId, 2654435761));
  const colors: FixtureColor[] = [];
  while (colors.length < count) {
    const round = [...FIXTURE_COLORS];
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [round[i], round[j]] = [round[j]!, round[i]!];
    }
    if (round[0] === colors.at(-1)) [round[0], round[3]] = [round[3]!, round[0]!];
    colors.push(...round);
  }
  return colors.slice(0, count);
}
