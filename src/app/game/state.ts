import { Rng } from './rng';

export const WIDTH = 480;
export const HEIGHT = 640;
export const BASKET_WIDTH = 80;
export const BASKET_Y = 600;
export const OBJECT_SIZE = 24;

export type Status = 'ready' | 'playing' | 'over';
export type ObjectKind = 'star' | 'rock';

export interface FallingObject {
  readonly id: number;
  readonly kind: ObjectKind;
  readonly x: number;
  readonly y: number;
  readonly speed: number;
}

export interface Input {
  readonly left: boolean;
  readonly right: boolean;
  readonly pointerX: number | null;
  readonly startPressed: boolean;
}

export interface GameEvent {
  readonly type: 'caught' | 'missed' | 'hitRock';
  readonly kind: ObjectKind;
}

export interface GameState {
  readonly status: Status;
  readonly basketX: number;
  readonly objects: readonly FallingObject[];
  readonly score: number;
  readonly lives: number;
  readonly elapsedMs: number;
  readonly spawnCooldownMs: number;
  readonly nextId: number;
  readonly rng: Rng;
  readonly events: readonly GameEvent[];
}

export function initialState(seed: number): GameState {
  return {
    status: 'ready',
    basketX: (WIDTH - BASKET_WIDTH) / 2,
    objects: [],
    score: 0,
    lives: 3,
    elapsedMs: 0,
    spawnCooldownMs: 700,
    nextId: 0,
    rng: { seed },
    events: [],
  };
}
