import { BASKET_WIDTH, BASKET_Y, HEIGHT, OBJECT_SIZE, FallingObject, ObjectKind } from '../state';
import { noInput, withState } from '../testing';
import { collide } from './collide';

const atBasket = (kind: ObjectKind): FallingObject => ({
  id: 1,
  kind,
  x: 100,
  y: BASKET_Y - OBJECT_SIZE,
  speed: 0.18,
});

describe('collide', () => {
  it('catching a star scores and emits caught', () => {
    const state = withState({ basketX: 100 - BASKET_WIDTH / 2, objects: [atBasket('star')] });
    const next = collide(state, noInput, 16);
    expect(next.score).toBe(1);
    expect(next.objects).toEqual([]);
    expect(next.events).toEqual([{ type: 'caught', kind: 'star' }]);
  });

  it('catching a rock costs a life and emits hitRock', () => {
    const state = withState({ basketX: 100 - BASKET_WIDTH / 2, objects: [atBasket('rock')] });
    const next = collide(state, noInput, 16);
    expect(next.lives).toBe(2);
    expect(next.score).toBe(0);
    expect(next.objects).toEqual([]);
    expect(next.events).toEqual([{ type: 'hitRock', kind: 'rock' }]);
  });

  it('an object beside the basket is not caught', () => {
    const state = withState({ basketX: 300, objects: [atBasket('star')] });
    const next = collide(state, noInput, 16);
    expect(next.score).toBe(0);
    expect(next.objects.length).toBe(1);
  });

  it('a missed star costs a life and emits missed', () => {
    const state = withState({
      basketX: 400,
      objects: [{ id: 1, kind: 'star', x: 10, y: HEIGHT, speed: 0.18 }],
    });
    const next = collide(state, noInput, 16);
    expect(next.lives).toBe(2);
    expect(next.objects).toEqual([]);
    expect(next.events).toEqual([{ type: 'missed', kind: 'star' }]);
  });

  it('a missed rock is removed without penalty', () => {
    const state = withState({
      basketX: 400,
      objects: [{ id: 1, kind: 'rock', x: 10, y: HEIGHT, speed: 0.18 }],
    });
    const next = collide(state, noInput, 16);
    expect(next.lives).toBe(3);
    expect(next.objects).toEqual([]);
    expect(next.events).toEqual([]);
  });

  it('does nothing unless playing', () => {
    const state = withState({ status: 'over', objects: [atBasket('star')] });
    expect(collide(state, noInput, 16)).toBe(state);
  });
});
