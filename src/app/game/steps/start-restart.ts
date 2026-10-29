import type { RuleStep } from '../rules';
import { initialState } from '../state';

export const startRestart: RuleStep = (state, input) => {
  if (state.status === 'playing' || !input.startPressed) {
    return state;
  }
  return { ...initialState(state.rng.seed), status: 'playing' };
};
