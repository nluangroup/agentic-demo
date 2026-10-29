import { RULES } from './rules';
import { GameState, Input } from './state';

export const MAX_DT_MS = 50;

export function tick(state: GameState, input: Input, dtMs: number): GameState {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);
  const start: GameState = { ...state, events: [] };
  return RULES.reduce((current, step) => step(current, input, dt), start);
}
