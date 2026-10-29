import type { RuleStep } from '../rules';
import { BASKET_WIDTH, BASKET_Y, FallingObject, GameEvent, HEIGHT, OBJECT_SIZE } from '../state';

export const collide: RuleStep = (state) => {
  if (state.status !== 'playing') {
    return state;
  }
  const remaining: FallingObject[] = [];
  const events: GameEvent[] = [...state.events];
  let score = state.score;
  let lives = state.lives;

  for (const o of state.objects) {
    const overlapsBasket =
      o.x + OBJECT_SIZE >= state.basketX && o.x <= state.basketX + BASKET_WIDTH;
    if (o.y + OBJECT_SIZE >= BASKET_Y && overlapsBasket) {
      if (o.kind === 'star') {
        score += 1;
        events.push({ type: 'caught', kind: 'star' });
      } else {
        lives -= 1;
        events.push({ type: 'hitRock', kind: 'rock' });
      }
    } else if (o.y >= HEIGHT) {
      if (o.kind === 'star') {
        lives -= 1;
        events.push({ type: 'missed', kind: 'star' });
      }
    } else {
      remaining.push(o);
    }
  }

  return { ...state, objects: remaining, score, lives, events };
};
