import { Rng, nextRandom } from './rng';

function sequence(seed: number, count: number): number[] {
  let rng: Rng = { seed };
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const [value, next] = nextRandom(rng);
    values.push(value);
    rng = next;
  }
  return values;
}

describe('nextRandom', () => {
  it('is deterministic for a seed and in [0,1)', () => {
    const first = sequence(7, 5);
    expect(sequence(7, 5)).toEqual(first);
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs between seeds', () => {
    expect(sequence(1, 5)).not.toEqual(sequence(2, 5));
  });
});
