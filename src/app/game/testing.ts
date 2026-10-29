import { GameState, Input, initialState } from './state';

export const noInput: Input = { left: false, right: false, pointerX: null, startPressed: false };

export function withState(partial: Partial<GameState> = {}): GameState {
  return { ...initialState(1), status: 'playing', ...partial };
}
