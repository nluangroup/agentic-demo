# Golden Star Power-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rare `golden` star (4 % of spawns) that scores +3 when caught and halves all fall speeds for 5 s, with a `Slow-mo 4.2s` countdown in the HUD.

**Architecture:** `'golden'` joins `ObjectKind`, and the three v1 places that branch on kind are updated (`spawn.ts` picks it from the existing kind roll, `collide.ts` treats it as catchable, the component draws it orange). A new pure rule module `src/app/game/golden-star.ts` adds one step, `goldenStar`, registered directly after `collide`: it reads that tick's `caught` events, adds the +2 bonus on top of collide's +1, sets `slowMoMs = 5000`, and counts the timer down. `fall.ts` multiplies movement by `fallRate(state)` from the same module. The HUD shows the countdown as a DOM element.

**Tech Stack:** Angular 22 (standalone, signals), TypeScript, Vitest via `ng test`, Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-29-golden-star-design.md`

**On-screen result:** An orange star occasionally falls; catching it adds 3 points and shows `Slow-mo 5.0s` counting down in the HUD while everything falls at half speed.

## Global Constraints

- Work on the current branch. Do not push, create branches or worktrees, merge, or open PRs. Do not edit `docs/superpowers/**`, `.claude/**`, `verify.ps1`, `tools/smoke.mjs`, and do not read or write `TODO.md`.
- Rules are pure TypeScript in `src/app/game/`: no DOM, no `Math.random`, no `Date.now`. A step returns a new state object when it changes something and the **same** object when it changes nothing.
- Golden probability **0.04** per spawn, taken from the existing kind roll: roll `< 0.15` → `'rock'`, `< 0.19` → `'golden'`, otherwise `'star'`. Do not draw an extra random number (seeded positions in v1 tests stay the same).
- Catching golden: +3 total (`collide` +1, `goldenStar` +2) and `slowMoMs = 5000` (restarts the timer if already running). Missing golden: no life lost, no event. While `slowMoMs > 0`, fall movement × 0.5.
- HUD text exactly `Slow-mo <s>s` with seconds rounded **up** to one decimal: `(Math.ceil(slowMoMs / 100) / 10).toFixed(1)` — 4200 → `Slow-mo 4.2s`, 4150 → `Slow-mo 4.2s`, 30 → `Slow-mo 0.1s`. Golden fill colour `#ff8c00`.
- Kind branches in v1 (there are no `switch` statements on kind): `src/app/game/steps/collide.ts` (catch branch and miss branch), `src/app/game/steps/spawn.ts` (kind choice), `src/app/game-canvas/game-canvas.ts` `drawObject` (rock vs star). This plan updates each; the miss branch already only penalises `'star'` and stays as is.
- Before every commit: `npx prettier --write <changed files>`, then `pwsh -NoProfile -File ./verify.ps1` must exit 0 and print exactly these five lines (among Vitest/build output):
  ```
  PASS: format
  PASS: lint
  PASS: build
  PASS: unit tests
  PASS: smoke render
  ```
  If it prints `SKIPPED: smoke render — …` instead of the last line, that is not a failure: carry on and mention the SKIPPED line in the final summary.
- Focused test runs while iterating: `npx ng test --watch=false --include <spec path>`.

## Review Focus

- **Golden star treated as a rock:** v1's collide catch branch is `star` vs everything else; a golden catch must score, not cost a life. Test: Task 1 `catching a golden star scores 1 and emits caught golden` (collide.spec).
- **Missing a golden star:** a bonus, so no life lost. Test: Task 1 `a missed golden star is removed without penalty`.
- **Second golden star during slow-mo:** timer restarts at 5000, does not add up or get ignored. Test: Task 1 `catching another golden star restarts the timer`.
- **Restart during slow-mo:** the new game starts at full speed with no countdown. Test: Task 1 `restart clears slow-mo`.
- **Countdown display near the end:** never shows `0.0s` while still active. Test: Task 2 `rounds the countdown up to tenths`.

---

## File Structure

```
src/app/game/state.ts                   ObjectKind += 'golden'; + GameState.slowMoMs (0)         (Task 1)
src/app/game/golden-star.ts             NEW SLOW_MO_MS, fallRate(), goldenStar step             (Task 1)
src/app/game/golden-star.spec.ts        NEW Vitest                                               (Task 1)
src/app/game/rules.ts                   register goldenStar directly after collide              (Task 1)
src/app/game/steps/spawn.ts (+spec)     kindForRoll() with GOLDEN_PROBABILITY                    (Task 1)
src/app/game/steps/collide.ts (+spec)   golden is catchable                                      (Task 1)
src/app/game/steps/fall.ts (+spec)      movement × fallRate(state)                               (Task 1)
src/app/game-canvas/game-canvas.ts      slowMo computed; golden fill in drawObject               (Task 2)
src/app/game-canvas/game-canvas.html    data-testid="slow-mo" in the HUD                         (Task 2)
src/app/game-canvas/game-canvas.spec.ts four component tests                                     (Task 2)
```

---

### Task 1: Golden star rules

**Files:**
- Modify: `src/app/game/state.ts` (`ObjectKind`, `GameState`, `initialState`)
- Create: `src/app/game/golden-star.ts`, `src/app/game/golden-star.spec.ts`
- Modify: `src/app/game/rules.ts` (`RULES` array and imports)
- Modify: `src/app/game/steps/spawn.ts`, `src/app/game/steps/spawn.spec.ts`
- Modify: `src/app/game/steps/collide.ts`, `src/app/game/steps/collide.spec.ts`
- Modify: `src/app/game/steps/fall.ts`, `src/app/game/steps/fall.spec.ts`

**Interfaces:**
- Consumes (v1): `GameState`, `ObjectKind`, `FallingObject`, `BASKET_Y`, `BASKET_WIDTH`, `OBJECT_SIZE`, `HEIGHT`, `initialState(seed)` from `src/app/game/state.ts`; `RuleStep`, `RULES` from `src/app/game/rules.ts`; `collide`, `fall`, `spawn` steps; `tick` from `src/app/game/tick.ts`; `noInput`, `withState(partial)` from `src/app/game/testing.ts` (built on `initialState(1)`, so `slowMoMs` defaults to 0). `collide.spec.ts` already has the helper `atBasket(kind: ObjectKind): FallingObject` (object at x 100, y `BASKET_Y - OBJECT_SIZE`).
- Produces (used by Task 2):
  - `export type ObjectKind = 'star' | 'rock' | 'golden';`
  - `GameState.slowMoMs: number` — `initialState` sets `0`.
  - In `src/app/game/golden-star.ts`: `export const SLOW_MO_MS = 5000;`, `export function fallRate(state: GameState): number` (0.5 when `slowMoMs > 0`, else 1), `export const goldenStar: RuleStep`.
  - In `src/app/game/steps/spawn.ts`: `export function kindForRoll(roll: number): ObjectKind`, used by `spawn` for `kind`.

- [ ] **Step 1: Extend the state** — in `src/app/game/state.ts` change `ObjectKind` to `'star' | 'rock' | 'golden'`, add `readonly slowMoMs: number;` to `GameState` (after `events`) and `slowMoMs: 0,` to `initialState`.

- [ ] **Step 2: Write the failing tests**

Append to `describe('spawn')` in `src/app/game/steps/spawn.spec.ts` (add `kindForRoll` to the `./spawn` import):

```ts
  it('kindForRoll: rock below 0.15, golden below 0.19, star otherwise', () => {
    expect([0, 0.1499, 0.15, 0.1899, 0.19, 0.99].map(kindForRoll)).toEqual([
      'rock',
      'rock',
      'golden',
      'golden',
      'star',
      'star',
    ]);
  });
```

Append to `describe('collide')` in `src/app/game/steps/collide.spec.ts`:

```ts
  it('catching a golden star scores 1 and emits caught golden', () => {
    const state = withState({ basketX: 100 - BASKET_WIDTH / 2, objects: [atBasket('golden')] });
    const next = collide(state, noInput, 16);
    expect(next.score).toBe(1);
    expect(next.lives).toBe(3);
    expect(next.events).toEqual([{ type: 'caught', kind: 'golden' }]);
  });

  it('a missed golden star is removed without penalty', () => {
    const state = withState({
      basketX: 400,
      objects: [{ id: 1, kind: 'golden', x: 10, y: HEIGHT, speed: 0.18 }],
    });
    const next = collide(state, noInput, 16);
    expect(next.lives).toBe(3);
    expect(next.objects).toEqual([]);
    expect(next.events).toEqual([]);
  });
```

Append to `describe('fall')` in `src/app/game/steps/fall.spec.ts`:

```ts
  it('halves fall speed during slow-mo', () => {
    const state = withState({
      slowMoMs: 1000,
      objects: [{ id: 0, kind: 'star', x: 10, y: 0, speed: 0.2 }],
    });
    expect(fall(state, noInput, 50).objects[0]?.y).toBeCloseTo(5);
  });
```

Create `src/app/game/golden-star.spec.ts`:

```ts
import { fallRate, goldenStar, SLOW_MO_MS } from './golden-star';
import { RULES } from './rules';
import { BASKET_Y, GameEvent, OBJECT_SIZE } from './state';
import { collide } from './steps/collide';
import { noInput, withState } from './testing';
import { tick } from './tick';

const caughtGolden: GameEvent = { type: 'caught', kind: 'golden' };

describe('goldenStar', () => {
  it('catching a golden star adds 2 more points and starts slow-mo', () => {
    const next = goldenStar(withState({ score: 1, events: [caughtGolden] }), noInput, 16);
    expect(next.score).toBe(3);
    expect(next.slowMoMs).toBe(SLOW_MO_MS);
    expect(SLOW_MO_MS).toBe(5000);
  });

  it('a normal catch does not start slow-mo', () => {
    const state = withState({ score: 1, events: [{ type: 'caught', kind: 'star' }] });
    expect(goldenStar(state, noInput, 16)).toBe(state);
  });

  it('counts slow-mo down to 0', () => {
    expect(goldenStar(withState({ slowMoMs: 5000 }), noInput, 50).slowMoMs).toBe(4950);
    expect(goldenStar(withState({ slowMoMs: 30 }), noInput, 50).slowMoMs).toBe(0);
  });

  it('catching another golden star restarts the timer', () => {
    const next = goldenStar(withState({ slowMoMs: 1200, events: [caughtGolden] }), noInput, 16);
    expect(next.slowMoMs).toBe(5000);
  });

  it('fallRate is 0.5 during slow-mo and 1 otherwise', () => {
    expect(fallRate(withState({ slowMoMs: 1 }))).toBe(0.5);
    expect(fallRate(withState({ slowMoMs: 0 }))).toBe(1);
  });

  it('runs right after collide in RULES', () => {
    expect(RULES.indexOf(goldenStar)).toBe(RULES.indexOf(collide) + 1);
  });

  it('through tick, a golden catch scores 3 and halves the next fall', () => {
    const caughtTick = tick(
      withState({
        basketX: 100,
        objects: [{ id: 0, kind: 'golden', x: 110, y: BASKET_Y - OBJECT_SIZE, speed: 0 }],
      }),
      noInput,
      16,
    );
    expect(caughtTick.score).toBe(3);
    expect(caughtTick.slowMoMs).toBe(5000);

    const next = tick(
      { ...caughtTick, objects: [{ id: 1, kind: 'star', x: 0, y: 100, speed: 0.2 }] },
      noInput,
      50,
    );
    expect(next.objects.find((o) => o.id === 1)?.y).toBeCloseTo(105);
    expect(next.slowMoMs).toBe(4950);
  });

  it('restart clears slow-mo', () => {
    const over = withState({ status: 'over', slowMoMs: 3000 });
    const next = tick(over, { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
    expect(next.slowMoMs).toBe(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game/golden-star.spec.ts`
Expected: FAIL — build error `Could not resolve "./golden-star"`.

- [ ] **Step 4: Implement `src/app/game/golden-star.ts`** — the three exports in the Interfaces block, with `import type { RuleStep } from './rules';`. `goldenStar(state, _input, dtMs)` does not check `status` (events only exist while playing); its algorithm:

```ts
let score = state.score;
let slowMoMs = Math.max(0, state.slowMoMs - dtMs);
for (const event of state.events) {
  if (event.type === 'caught' && event.kind === 'golden') {
    score += 2; // collide already added 1
    slowMoMs = SLOW_MO_MS;
  }
}
// return `state` itself when score and slowMoMs are both unchanged
```

- [ ] **Step 5: Update the kind branches in the steps**
  - `src/app/game/steps/spawn.ts`: add `const GOLDEN_PROBABILITY = 0.04;` and `export function kindForRoll(roll: number): ObjectKind` (rock if `roll < ROCK_PROBABILITY`, golden if `roll < ROCK_PROBABILITY + GOLDEN_PROBABILITY`, else star); the object literal uses `kind: kindForRoll(kindRoll)`. Import `ObjectKind` from `'../state'`.
  - `src/app/game/steps/collide.ts`: in the catch branch (`o.y + OBJECT_SIZE >= BASKET_Y && overlapsBasket`) test `o.kind === 'rock'` first (lives −1, `hitRock` event, unchanged); every other kind scores +1 and pushes `{ type: 'caught', kind: o.kind }`. The miss branch stays as is.
  - `src/app/game/steps/fall.ts`: move each object by `o.speed * fallRate(state) * dtMs`, importing `fallRate` from `'../golden-star'`. `elapsedMs` still advances by the full `dtMs`.

- [ ] **Step 6: Register the step** — in `src/app/game/rules.ts` add `import { goldenStar } from './golden-star';` and insert `goldenStar,` in `RULES` on its own line directly after `collide,` (before `gameOver,`).

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game/golden-star.spec.ts --include src/app/game/steps/spawn.spec.ts --include src/app/game/steps/collide.spec.ts --include src/app/game/steps/fall.spec.ts`
Expected: `Tests  22 passed (22)`

- [ ] **Step 8: Verify the whole project**

Run: `npx prettier --write src/app/game`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  44 passed (44)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 9: Commit**

```bash
git add src/app/game
git commit -m "feat: golden star power-up rules"
```

---

### Task 2: Draw the golden star and show the slow-mo countdown

**Files:**
- Modify: `src/app/game-canvas/game-canvas.ts` (`slowMo` computed; `drawObject` fill colour)
- Modify: `src/app/game-canvas/game-canvas.html` (HUD)
- Modify: `src/app/game-canvas/game-canvas.spec.ts` (four tests appended inside `describe('GameCanvas')`)

**Interfaces:**
- Consumes: `GameState.slowMoMs`, `ObjectKind` `'golden'` (Task 1); the component's existing private `drawObject(ctx, o)` (rock → grey circle, otherwise a 5-point star filled `#ffd700`) and public `step(dtMs)`; in the spec, the existing `fixture`, `component`, `text(fixture, id)` helper, `withState` import and the `getContext` spy set up in `beforeEach`.
- Produces (on `GameCanvas`):
  - `protected readonly slowMo = computed<string>(…)` — `` `Slow-mo ${(Math.ceil(s.slowMoMs / 100) / 10).toFixed(1)}s` `` while `s.slowMoMs > 0`, otherwise `''`.
  - In `drawObject`, the star branch uses `ctx.fillStyle = o.kind === 'golden' ? '#ff8c00' : '#ffd700';` (golden keeps the star shape).

- [ ] **Step 1: Write the failing tests** — append inside `describe('GameCanvas', …)` in `src/app/game-canvas/game-canvas.spec.ts`:

```ts
  it('shows the slow-mo countdown', async () => {
    component.state.set(withState({ slowMoMs: 4200 }));
    await fixture.whenStable();
    expect(text(fixture, 'slow-mo')).toBe('Slow-mo 4.2s');
  });

  it('rounds the countdown up to tenths', async () => {
    component.state.set(withState({ slowMoMs: 4150 }));
    await fixture.whenStable();
    expect(text(fixture, 'slow-mo')).toBe('Slow-mo 4.2s');
    component.state.set(withState({ slowMoMs: 30 }));
    await fixture.whenStable();
    expect(text(fixture, 'slow-mo')).toBe('Slow-mo 0.1s');
  });

  it('hides the countdown when slow-mo is off', async () => {
    component.state.set(withState({ slowMoMs: 0 }));
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="slow-mo"]'),
    ).toBeNull();
  });

  it('draws a golden star in orange', () => {
    const fills: string[] = [];
    const ctx = {
      fillStyle: '',
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill() {
        fills.push(this.fillStyle);
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    component.state.set(
      withState({ objects: [{ id: 0, kind: 'golden', x: 10, y: 10, speed: 0 }] }),
    );
    component.step(0);
    expect(fills[0]).toBe('#ff8c00');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: FAIL — `shows the slow-mo countdown` fails with `expected '' to be 'Slow-mo 4.2s'`, and `draws a golden star in orange` fails with `expected '#ffd700' to be '#ff8c00'`.

- [ ] **Step 3: Implement** — in `game-canvas.ts` add the `slowMo` computed and the golden fill from the Interfaces block. In `game-canvas.html`, inside `<div class="hud">` between the `score` and `lives` spans, add:

```html
@if (slowMo()) {
  <span data-testid="slow-mo">{{ slowMo() }}</span>
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: `Tests  9 passed (9)`

- [ ] **Step 5: Verify the whole project**

Run: `npx prettier --write src/app/game-canvas`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  48 passed (48)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 6: Commit**

```bash
git add src/app/game-canvas/game-canvas.ts src/app/game-canvas/game-canvas.html src/app/game-canvas/game-canvas.spec.ts
git commit -m "feat: draw golden stars and show the slow-mo countdown"
```
