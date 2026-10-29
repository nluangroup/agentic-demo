import { initialState } from '../state';
import { noInput, withState } from '../testing';
import { startRestart } from './start-restart';

describe('startRestart', () => {
  it('starts from ready on startPressed', () => {
    const next = startRestart(initialState(1), { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
    expect(next.spawnCooldownMs).toBe(700);
  });

  it('ignores startPressed while playing', () => {
    const state = withState({ score: 4 });
    expect(startRestart(state, { ...noInput, startPressed: true }, 16)).toBe(state);
  });

  it('waits without startPressed', () => {
    const state = initialState(1);
    expect(startRestart(state, noInput, 16)).toBe(state);
  });
});
