import { OBJECT_SIZE, WIDTH } from '../state';
import { noInput, withState } from '../testing';
import { spawn } from './spawn';

function run(seed: number) {
  let state = withState({ rng: { seed }, spawnCooldownMs: 700 });
  for (let i = 0; i < 100; i++) {
    state = spawn(state, noInput, 50);
  }
  return state;
}

describe('spawn', () => {
  it('spawns every 700 ms with seeded positions', () => {
    const a = run(42);
    const b = run(42);
    expect(a.objects).toEqual(b.objects);
    expect(a.objects.length).toBe(7);
    for (const o of a.objects) {
      expect(o.x).toBeGreaterThanOrEqual(0);
      expect(o.x).toBeLessThanOrEqual(WIDTH - OBJECT_SIZE);
      expect(o.speed).toBe(0.18);
      expect(o.y).toBe(-OBJECT_SIZE);
    }
    expect(new Set(a.objects.map((o) => o.id)).size).toBe(7);
  });

  it('does not spawn before the cooldown elapses', () => {
    const state = withState({ spawnCooldownMs: 700 });
    const next = spawn(state, noInput, 50);
    expect(next.objects).toEqual([]);
    expect(next.spawnCooldownMs).toBe(650);
  });

  it('does nothing unless playing', () => {
    const state = withState({ status: 'over', spawnCooldownMs: 0 });
    expect(spawn(state, noInput, 50)).toBe(state);
  });
});
