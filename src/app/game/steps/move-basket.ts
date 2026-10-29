import type { RuleStep } from '../rules';
import { BASKET_WIDTH, WIDTH } from '../state';

const BASKET_SPEED = 0.5;

export const moveBasket: RuleStep = (state, input, dtMs) => {
  if (state.status !== 'playing') {
    return state;
  }
  let target = state.basketX;
  if (input.pointerX !== null) {
    target = input.pointerX - BASKET_WIDTH / 2;
  } else {
    target += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * BASKET_SPEED * dtMs;
  }
  const basketX = Math.min(Math.max(target, 0), WIDTH - BASKET_WIDTH);
  return basketX === state.basketX ? state : { ...state, basketX };
};
