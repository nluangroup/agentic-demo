import { noInput, withState } from './testing';
import { MAX_DT_MS, tick } from './tick';
import { initialState } from './state';

describe('tick', () => {
  it('does nothing but wait in ready state', () => {
    const next = tick(initialState(1), noInput, 16);
    expect(next.status).toBe('ready');
    expect(next.objects).toEqual([]);
  });

  it('starts on space and plays', () => {
    const next = tick(initialState(1), { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
  });

  it('clamps a long frame to 50 ms', () => {
    const state = withState({
      spawnCooldownMs: 10,
      objects: [{ id: 0, kind: 'star', x: 0, y: 100, speed: 0.18 }],
      nextId: 1,
    });
    const next = tick(state, noInput, 5000);
    expect(MAX_DT_MS).toBe(50);
    const original = next.objects.find((o) => o.id === 0);
    expect(original?.y).toBeCloseTo(100 + 0.18 * 50);
    expect(next.objects.length).toBe(2);
  });

  it('clears last tick events', () => {
    const state = withState({ events: [{ type: 'caught', kind: 'star' }] });
    expect(tick(state, noInput, 16).events).toEqual([]);
  });
});
