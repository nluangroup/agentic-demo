import { noInput, withState } from '../testing';
import { fall } from './fall';

describe('fall', () => {
  it('moves objects by speed * dt and advances elapsed time', () => {
    const state = withState({
      objects: [{ id: 0, kind: 'star', x: 10, y: 0, speed: 0.2 }],
    });
    const next = fall(state, noInput, 50);
    expect(next.objects[0]?.y).toBeCloseTo(10);
    expect(next.elapsedMs).toBe(50);
  });
});
