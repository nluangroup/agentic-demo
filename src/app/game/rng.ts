export interface Rng {
  readonly seed: number;
}

export function nextRandom(rng: Rng): [value: number, next: Rng] {
  const state = (rng.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, { seed: state >>> 0 }];
}
