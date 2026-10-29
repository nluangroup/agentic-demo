# Combo Multiplier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consecutive catches build a combo whose multiplier (×1…×5) scales each star's points, and a `×N` pop-up appears over the basket for 600 ms whenever the multiplier rises.

**Architecture:** A new pure rule module `src/app/game/combo.ts` exports `comboMultiplier()` and one rule step, `applyCombo`, registered in `RULES` directly after `collide` so it sees that tick's `caught` / `missed` / `hitRock` events. Two new `GameState` fields (`combo`, `comboPopMs`) hold the streak and the pop's remaining lifetime, so the pop is deterministic game state. The component derives the pop text and position from state and renders one DOM element.

**Tech Stack:** Angular 22 (standalone, signals), TypeScript, Vitest via `ng test`, Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-29-combo-multiplier-design.md`

**On-screen result:** Catching three stars in a row shows `×2` above the basket and the third star adds 2 to the score.

## Global Constraints

- Work on the current branch. Do not push, create branches or worktrees, merge, or open PRs. Do not edit `docs/superpowers/**`, `.claude/**`, `verify.ps1`, `tools/smoke.mjs`, and do not read or write `TODO.md`.
- Rules are pure TypeScript in `src/app/game/`: no DOM, no `Math.random`, no `Date.now`, no timers. A step returns a new state object when it changes something and the **same** object when it changes nothing.
- Multiplier = `1 + Math.floor(combo / 3)`, capped at **5**. Pop lifetime **600 ms**. Pop text is `×` (U+00D7 MULTIPLICATION SIGN) followed by the number, e.g. `×2`.
- `collide` already adds +1 to `score` per caught star; `applyCombo` adds `multiplier − 1` on top. Do not edit any file in `src/app/game/steps/`.
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

- **Catch and miss in the same tick:** events are processed in array order; a catch that reaches ×2 followed by a miss ends the tick at combo 0 with no pop. Test: Task 1 `processes events in order`.
- **Restart after game over:** a new game starts at combo 0 with no pop showing. Test: Task 1 `restart clears the combo`.
- **Long streaks:** past combo 12 the multiplier stays ×5, scores 5 per star and does not pop again. Test: Task 1 `caps the multiplier at 5`.
- **The step is actually wired into `tick`:** a module that is tested alone but not registered changes nothing on screen. Tests: Task 1 `runs right after collide in RULES` and `three catches in a row through tick score 1 + 1 + 2`.
- **Basket at the field edge:** the pop is centred on the basket's centre as a percentage of the 480 px field, so it scales with the canvas. Test: Task 2 `pops the multiplier above the basket`.

---

## File Structure

```
src/app/game/state.ts                  + GameState.combo, GameState.comboPopMs (both 0 in initialState)   (Task 1)
src/app/game/combo.ts                  NEW comboMultiplier(), COMBO_POP_MS, applyCombo step              (Task 1)
src/app/game/combo.spec.ts             NEW Vitest for the rule                                           (Task 1)
src/app/game/rules.ts                  register applyCombo directly after collide                       (Task 1)
src/app/game-canvas/game-canvas.ts     comboPop / comboPopLeft / comboPopTop                             (Task 2)
src/app/game-canvas/game-canvas.html   the data-testid="combo-pop" element                               (Task 2)
src/app/game-canvas/game-canvas.css    .combo-pop style                                                   (Task 2)
src/app/game-canvas/game-canvas.spec.ts two component tests                                               (Task 2)
```

---

### Task 1: Combo rule module

**Files:**
- Modify: `src/app/game/state.ts` (interface `GameState`, function `initialState`)
- Create: `src/app/game/combo.ts`
- Create: `src/app/game/combo.spec.ts`
- Modify: `src/app/game/rules.ts` (`RULES` array and imports)

**Interfaces:**
- Consumes (v1, unchanged): `GameState`, `GameEvent`, `initialState(seed)`, `BASKET_Y`, `OBJECT_SIZE`, `FallingObject` from `src/app/game/state.ts`; `RuleStep` and `RULES` from `src/app/game/rules.ts`; `collide` from `src/app/game/steps/collide.ts`; `tick` from `src/app/game/tick.ts`; `noInput`, `withState(partial)` from `src/app/game/testing.ts` (`withState` spreads `initialState(1)`, so new fields get their defaults automatically).
- Produces (used by Task 2):
  - `GameState.combo: number` — consecutive catches since the last miss/rock; `initialState` sets `0`.
  - `GameState.comboPopMs: number` — remaining pop lifetime in ms; `initialState` sets `0`.
  - `export const COMBO_POP_MS = 600;`
  - `export function comboMultiplier(combo: number): number` — `Math.min(1 + Math.floor(combo / 3), 5)`.
  - `export const applyCombo: RuleStep`

- [ ] **Step 1: Add the two state fields**

In `src/app/game/state.ts` add `readonly combo: number;` and `readonly comboPopMs: number;` to `GameState` (after `events`), and `combo: 0, comboPopMs: 0,` to the object returned by `initialState`.

- [ ] **Step 2: Write the failing tests** — create `src/app/game/combo.spec.ts`:

```ts
import { applyCombo, COMBO_POP_MS, comboMultiplier } from './combo';
import { RULES } from './rules';
import { BASKET_Y, FallingObject, GameEvent, OBJECT_SIZE } from './state';
import { collide } from './steps/collide';
import { noInput, withState } from './testing';
import { tick } from './tick';

const caught: GameEvent = { type: 'caught', kind: 'star' };
const missed: GameEvent = { type: 'missed', kind: 'star' };
const hitRock: GameEvent = { type: 'hitRock', kind: 'rock' };

describe('comboMultiplier', () => {
  it('is 1 + floor(combo / 3), capped at 5', () => {
    expect([0, 2, 3, 5, 6, 11, 12, 30].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
  });
});

describe('applyCombo', () => {
  it('third consecutive catch scores at ×2 and pops', () => {
    const next = applyCombo(withState({ combo: 2, score: 3, events: [caught] }), noInput, 16);
    expect(next.combo).toBe(3);
    expect(next.score).toBe(4);
    expect(next.comboPopMs).toBe(COMBO_POP_MS);
    expect(COMBO_POP_MS).toBe(600);
  });

  it('a catch that keeps the multiplier does not pop', () => {
    const next = applyCombo(
      withState({ combo: 3, score: 5, comboPopMs: 100, events: [caught] }),
      noInput,
      16,
    );
    expect(next.combo).toBe(4);
    expect(next.score).toBe(6);
    expect(next.comboPopMs).toBe(84);
  });

  it('a miss resets the combo', () => {
    const next = applyCombo(withState({ combo: 7, score: 9, events: [missed] }), noInput, 16);
    expect(next.combo).toBe(0);
    expect(next.score).toBe(9);
  });

  it('hitting a rock resets the combo', () => {
    const next = applyCombo(withState({ combo: 7, score: 9, events: [hitRock] }), noInput, 16);
    expect(next.combo).toBe(0);
    expect(next.score).toBe(9);
  });

  it('caps the multiplier at 5', () => {
    const next = applyCombo(withState({ combo: 14, score: 40, events: [caught] }), noInput, 16);
    expect(next.combo).toBe(15);
    expect(next.score).toBe(44);
    expect(next.comboPopMs).toBe(0);
  });

  it('processes events in order', () => {
    const next = applyCombo(
      withState({ combo: 2, score: 3, events: [caught, missed] }),
      noInput,
      16,
    );
    expect(next.combo).toBe(0);
    expect(next.score).toBe(4);
    expect(next.comboPopMs).toBe(0);
  });

  it('counts the pop down to 0', () => {
    expect(applyCombo(withState({ comboPopMs: 600 }), noInput, 50).comboPopMs).toBe(550);
    expect(applyCombo(withState({ comboPopMs: 30 }), noInput, 50).comboPopMs).toBe(0);
  });

  it('returns the same state when there is nothing to do', () => {
    const state = withState({ combo: 4 });
    expect(applyCombo(state, noInput, 16)).toBe(state);
  });

  it('runs right after collide in RULES', () => {
    expect(RULES.indexOf(applyCombo)).toBe(RULES.indexOf(collide) + 1);
  });

  it('three catches in a row through tick score 1 + 1 + 2', () => {
    const starAtBasket = (id: number): FallingObject => ({
      id,
      kind: 'star',
      x: 110,
      y: BASKET_Y - OBJECT_SIZE,
      speed: 0,
    });
    let state = withState({ basketX: 100 });
    for (let id = 0; id < 3; id++) {
      state = tick({ ...state, objects: [starAtBasket(id)] }, noInput, 16);
    }
    expect(state.score).toBe(4);
    expect(state.combo).toBe(3);
    expect(state.comboPopMs).toBe(600);
  });

  it('restart clears the combo', () => {
    const over = withState({ status: 'over', combo: 5, comboPopMs: 300 });
    const next = tick(over, { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
    expect(next.combo).toBe(0);
    expect(next.comboPopMs).toBe(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game/combo.spec.ts`
Expected: FAIL — build error `Could not resolve "./combo"` (the module does not exist yet).

- [ ] **Step 4: Implement `src/app/game/combo.ts`**

Exports exactly the three names in the Interfaces block, with `import type { RuleStep } from './rules';` (type-only, like the v1 steps). `applyCombo(state, _input, dtMs)` does not check `status` (events only exist while playing, and the pop must finish counting down after game over). Its algorithm:

```ts
const before = comboMultiplier(state.combo);
let combo = state.combo;
let score = state.score;
for (const event of state.events) {
  if (event.type === 'caught') {
    combo += 1;
    score += comboMultiplier(combo) - 1;
  } else {
    combo = 0; // 'missed' | 'hitRock'
  }
}
const comboPopMs =
  comboMultiplier(combo) > before ? COMBO_POP_MS : Math.max(0, state.comboPopMs - dtMs);
// return `state` itself when combo, score and comboPopMs are all unchanged
```

- [ ] **Step 5: Register the step** — in `src/app/game/rules.ts` add `import { applyCombo } from './combo';` and insert `applyCombo,` in `RULES` on its own line directly after `collide,` (before `gameOver,`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game/combo.spec.ts`
Expected: `Tests  12 passed (12)`

- [ ] **Step 7: Verify the whole project**

Run: `npx prettier --write src/app/game/state.ts src/app/game/combo.ts src/app/game/combo.spec.ts src/app/game/rules.ts`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  44 passed (44)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 8: Commit**

```bash
git add src/app/game/state.ts src/app/game/combo.ts src/app/game/combo.spec.ts src/app/game/rules.ts
git commit -m "feat: combo multiplier rule step"
```

---

### Task 2: Combo pop-up overlay

**Files:**
- Modify: `src/app/game-canvas/game-canvas.ts` (imports, two `computed`s and one field on `GameCanvas`)
- Modify: `src/app/game-canvas/game-canvas.html` (new element after the `.hud` div)
- Modify: `src/app/game-canvas/game-canvas.css` (new `.combo-pop` rule)
- Modify: `src/app/game-canvas/game-canvas.spec.ts` (two tests appended inside `describe('GameCanvas')`)

**Interfaces:**
- Consumes: `comboMultiplier(combo: number): number` from `src/app/game/combo.ts`; `GameState.combo`, `GameState.comboPopMs` (Task 1); `BASKET_WIDTH`, `BASKET_Y`, `HEIGHT`, `WIDTH` from `src/app/game/state.ts` (already imported by the component); the spec file's existing `fixture`, `component`, `text(fixture, id)` helper and `withState` import.
- Produces (on `GameCanvas`):
  - `protected readonly comboPop = computed<string>(…)` — `` `×${comboMultiplier(s.combo)}` `` while `s.comboPopMs > 0`, otherwise `''`.
  - `protected readonly comboPopLeft = computed<number>(…)` — basket centre as a percentage of the field: `((s.basketX + BASKET_WIDTH / 2) / WIDTH) * 100`.
  - `protected readonly comboPopTop = (BASKET_Y / HEIGHT) * 100;`

- [ ] **Step 1: Write the failing tests** — append inside `describe('GameCanvas', …)` in `src/app/game-canvas/game-canvas.spec.ts`:

```ts
  it('pops the multiplier above the basket', async () => {
    component.state.set(withState({ basketX: 200, combo: 3, comboPopMs: 600 }));
    await fixture.whenStable();
    expect(text(fixture, 'combo-pop')).toBe('×2');
    const pop = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-testid="combo-pop"]',
    )!;
    expect(pop.style.left).toBe('50%');
  });

  it('hides the pop when its time is up', async () => {
    component.state.set(withState({ combo: 3, comboPopMs: 0 }));
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="combo-pop"]'),
    ).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: FAIL — `pops the multiplier above the basket` fails with `expected '' to be '×2'`.

- [ ] **Step 3: Implement the overlay**

- `game-canvas.ts`: add `import { comboMultiplier } from '../game/combo';` and the three members from the Interfaces block.
- `game-canvas.html`: directly after the closing `</div>` of `.hud`, add
  ```html
  @if (comboPop()) {
    <div
      class="combo-pop"
      data-testid="combo-pop"
      [style.left.%]="comboPopLeft()"
      [style.top.%]="comboPopTop"
    >
      {{ comboPop() }}
    </div>
  }
  ```
- `game-canvas.css`: `.combo-pop` — `position: absolute`, `transform: translate(-50%, -100%)` (centred on the basket, sitting on top of it), `color: #ffd700`, `font: 700 1.6rem system-ui, sans-serif`, `pointer-events: none`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: `Tests  7 passed (7)`

- [ ] **Step 5: Verify the whole project**

Run: `npx prettier --write src/app/game-canvas`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  46 passed (46)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 6: Commit**

```bash
git add src/app/game-canvas/game-canvas.ts src/app/game-canvas/game-canvas.html src/app/game-canvas/game-canvas.css src/app/game-canvas/game-canvas.spec.ts
git commit -m "feat: show combo multiplier pop-up over the basket"
```
