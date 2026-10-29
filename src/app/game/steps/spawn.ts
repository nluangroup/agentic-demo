import type { RuleStep } from '../rules';
import { nextRandom } from '../rng';
import { OBJECT_SIZE, WIDTH } from '../state';

const SPAWN_INTERVAL_MS = 700;
const ROCK_PROBABILITY = 0.15;
const FALL_SPEED = 0.18;

export const spawn: RuleStep = (state, _input, dtMs) => {
  if (state.status !== 'playing') {
    return state;
  }
  const spawnCooldownMs = state.spawnCooldownMs - dtMs;
  if (spawnCooldownMs > 0) {
    return { ...state, spawnCooldownMs };
  }
  const [xRoll, afterX] = nextRandom(state.rng);
  const [kindRoll, rng] = nextRandom(afterX);
  const object = {
    id: state.nextId,
    kind: kindRoll < ROCK_PROBABILITY ? ('rock' as const) : ('star' as const),
    x: xRoll * (WIDTH - OBJECT_SIZE),
    y: -OBJECT_SIZE,
    speed: FALL_SPEED,
  };
  return {
    ...state,
    objects: [...state.objects, object],
    nextId: state.nextId + 1,
    spawnCooldownMs: spawnCooldownMs + SPAWN_INTERVAL_MS,
    rng,
  };
};
