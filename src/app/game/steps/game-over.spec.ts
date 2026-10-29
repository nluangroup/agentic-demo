import { noInput, withState } from '../testing';
import { tick } from '../tick';
import { gameOver } from './game-over';

describe('gameOver', () => {
  it('lives reaching 0 ends the game', () => {
    const next = gameOver(withState({ lives: 0 }), noInput, 16);
    expect(next.status).toBe('over');
  });

  it('keeps playing while lives remain', () => {
    const state = withState({ lives: 1 });
    expect(gameOver(state, noInput, 16)).toBe(state);
  });

  it('space after game over restarts with score 0 and 3 lives', () => {
    const over = withState({ status: 'over', lives: 0, score: 9 });
    const next = tick(over, { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
    expect(next.score).toBe(0);
    expect(next.lives).toBe(3);
    expect(next.objects).toEqual([]);
  });
});
