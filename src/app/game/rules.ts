import { GameState, Input } from './state';
import { collide } from './steps/collide';
import { fall } from './steps/fall';
import { gameOver } from './steps/game-over';
import { moveBasket } from './steps/move-basket';
import { spawn } from './steps/spawn';
import { startRestart } from './steps/start-restart';

export type RuleStep = (state: GameState, input: Input, dtMs: number) => GameState;

export const RULES: readonly RuleStep[] = [
  startRestart,
  moveBasket,
  spawn,
  fall,
  collide,
  gameOver,
];
