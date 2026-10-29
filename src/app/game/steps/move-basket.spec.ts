import { BASKET_WIDTH, WIDTH } from '../state';
import { noInput, withState } from '../testing';
import { moveBasket } from './move-basket';

describe('moveBasket', () => {
  it('moves with keys and clamps to the field', () => {
    let state = withState();
    for (let i = 0; i < 40; i++) {
      state = moveBasket(state, { ...noInput, right: true }, 50);
    }
    expect(state.basketX + BASKET_WIDTH / 2).toBe(WIDTH - BASKET_WIDTH / 2);
    expect(state.basketX).toBe(WIDTH - BASKET_WIDTH);
    for (let i = 0; i < 40; i++) {
      state = moveBasket(state, { ...noInput, left: true }, 50);
    }
    expect(state.basketX).toBe(0);
  });

  it('moves at 0.5 px/ms', () => {
    const state = withState({ basketX: 100 });
    expect(moveBasket(state, { ...noInput, right: true }, 20).basketX).toBeCloseTo(110);
  });

  it('follows the pointer', () => {
    const next = moveBasket(withState(), { ...noInput, pointerX: 100 }, 16);
    expect(next.basketX + BASKET_WIDTH / 2).toBe(100);
  });

  it('does nothing unless playing', () => {
    const state = withState({ status: 'ready', basketX: 50 });
    expect(moveBasket(state, { ...noInput, right: true }, 16)).toBe(state);
  });
});
