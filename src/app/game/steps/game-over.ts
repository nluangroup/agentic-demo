import type { RuleStep } from '../rules';

export const gameOver: RuleStep = (state) => {
  if (state.status !== 'playing' || state.lives > 0) {
    return state;
  }
  return { ...state, status: 'over' };
};
