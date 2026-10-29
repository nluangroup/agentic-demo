# High Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember the best score in `localStorage` (`star-catcher.best`) and show `Best: n` — plus `New best!` when beaten — on the game-over screen.

**Architecture:** A pure rule module `src/app/game/high-score.ts` adds one step, `recordHighScore`, registered last in `RULES` (after `gameOver`): when the game is over and `score > best` it sets `best = score` and `isNewBest = true`. Two new `GameState` fields carry these values. Storage stays out of the rules: the component reads the stored best once at construction, supplies it as `state.best` before every `tick` (restart rebuilds state from `initialState`, which resets `best` to 0), and writes it back when a tick reports a new best.

**Tech Stack:** Angular 22 (standalone, signals), TypeScript, Vitest via `ng test` (jsdom, which provides `localStorage`), Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-29-high-score-design.md`

**On-screen result:** After a game that beats the stored best, the game-over screen shows `Best: <score>` and `New best!`, and after a page reload the next game-over screen still shows that best.

## Global Constraints

- Work on the current branch. Do not push, create branches or worktrees, merge, or open PRs. Do not edit `docs/superpowers/**`, `.claude/**`, `verify.ps1`, `tools/smoke.mjs`, and do not read or write `TODO.md`.
- Rules are pure TypeScript in `src/app/game/`: no DOM, no `localStorage`, no `Math.random`, no `Date.now`. A step returns a new state object when it changes something and the **same** object when it changes nothing. Do not edit any file in `src/app/game/steps/`.
- Storage key exactly `star-catcher.best`; value is the score as a decimal string. Overlay text exactly `Best: <n>` and `New best!`.
- A new best requires `score > best` (strictly greater).
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

- **Storage unavailable (private mode, blocked site data):** `getItem`/`setItem` throw; the game still plays, records the best for the session, and shows the overlay. Test: Task 2 `keeps working when storage is unavailable`.
- **Garbage in storage (`"abc"`, `"-3"`, `"2.5"`):** reads as 0, never `NaN` on screen. Test: Task 2 `ignores an invalid stored value`.
- **Restart after a new best:** `New best!` disappears for the next game and the old record still counts. Tests: Task 1 `restart clears isNewBest`, Task 2 `loads the stored best and does not flag a lower score`.
- **Equal score / 0-point game:** not a new best. Tests: Task 1 `an equal score is not a new best`, `a 0-point game is never a new best`.
- **Game over tick itself:** the best is recorded in the same tick lives reach 0 (the step runs after `gameOver`). Test: Task 1 `the game-ending tick records the best`.

---

## File Structure

```
src/app/game/state.ts                   + GameState.best (0), GameState.isNewBest (false)      (Task 1)
src/app/game/high-score.ts              NEW recordHighScore step                                (Task 1)
src/app/game/high-score.spec.ts         NEW Vitest for the rule                                 (Task 1)
src/app/game/rules.ts                   register recordHighScore last, after gameOver          (Task 1)
src/app/game-canvas/game-canvas.ts      read/write storage, supply best to tick                 (Task 2)
src/app/game-canvas/game-canvas.html    Best / New best! inside the game-over message           (Task 2)
src/app/game-canvas/game-canvas.spec.ts nested describe('high score') with six tests            (Task 2)
```

---

### Task 1: High-score rule module

**Files:**
- Modify: `src/app/game/state.ts` (interface `GameState`, function `initialState`)
- Create: `src/app/game/high-score.ts`
- Create: `src/app/game/high-score.spec.ts`
- Modify: `src/app/game/rules.ts` (`RULES` array and imports)

**Interfaces:**
- Consumes (v1, unchanged): `GameState`, `HEIGHT`, `initialState(seed)` from `src/app/game/state.ts`; `RuleStep`, `RULES` from `src/app/game/rules.ts`; `gameOver` from `src/app/game/steps/game-over.ts`; `tick` from `src/app/game/tick.ts`; `noInput`, `withState(partial)` from `src/app/game/testing.ts` (built on `initialState(1)`, so new fields get their defaults automatically).
- Produces (used by Task 2):
  - `GameState.best: number` — `initialState` sets `0`.
  - `GameState.isNewBest: boolean` — `initialState` sets `false`.
  - `export const recordHighScore: RuleStep` in `src/app/game/high-score.ts` — if `state.status === 'over' && state.score > state.best` returns `{ ...state, best: state.score, isNewBest: true }`, otherwise returns `state`.

- [ ] **Step 1: Add the two state fields**

In `src/app/game/state.ts` add `readonly best: number;` and `readonly isNewBest: boolean;` to `GameState` (after `events`), and `best: 0, isNewBest: false,` to the object returned by `initialState`.

- [ ] **Step 2: Write the failing tests** — create `src/app/game/high-score.spec.ts`:

```ts
import { recordHighScore } from './high-score';
import { RULES } from './rules';
import { HEIGHT } from './state';
import { gameOver } from './steps/game-over';
import { noInput, withState } from './testing';
import { tick } from './tick';

describe('recordHighScore', () => {
  it('records a new best at game over', () => {
    const next = recordHighScore(withState({ status: 'over', score: 7, best: 5 }), noInput, 16);
    expect(next.best).toBe(7);
    expect(next.isNewBest).toBe(true);
  });

  it('an equal score is not a new best', () => {
    const state = withState({ status: 'over', score: 5, best: 5 });
    expect(recordHighScore(state, noInput, 16)).toBe(state);
  });

  it('a 0-point game is never a new best', () => {
    const state = withState({ status: 'over', score: 0, best: 0 });
    expect(recordHighScore(state, noInput, 16)).toBe(state);
  });

  it('does nothing while playing', () => {
    const state = withState({ score: 9, best: 5 });
    expect(recordHighScore(state, noInput, 16)).toBe(state);
  });

  it('runs right after gameOver in RULES', () => {
    expect(RULES.indexOf(recordHighScore)).toBe(RULES.indexOf(gameOver) + 1);
  });

  it('the game-ending tick records the best', () => {
    const state = withState({
      lives: 1,
      score: 4,
      best: 3,
      basketX: 400,
      objects: [{ id: 0, kind: 'star', x: 10, y: HEIGHT, speed: 0.18 }],
    });
    const next = tick(state, noInput, 16);
    expect(next.status).toBe('over');
    expect(next.best).toBe(4);
    expect(next.isNewBest).toBe(true);
  });

  it('restart clears isNewBest', () => {
    const over = withState({ status: 'over', score: 4, best: 4, isNewBest: true });
    const next = tick(over, { ...noInput, startPressed: true }, 16);
    expect(next.status).toBe('playing');
    expect(next.isNewBest).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game/high-score.spec.ts`
Expected: FAIL — build error `Could not resolve "./high-score"`.

- [ ] **Step 4: Implement `src/app/game/high-score.ts`** — exactly the `recordHighScore` behaviour in the Interfaces block, with `import type { RuleStep } from './rules';` like the v1 steps.

- [ ] **Step 5: Register the step** — in `src/app/game/rules.ts` add `import { recordHighScore } from './high-score';` and add `recordHighScore,` as the last entry of `RULES`, on its own line after `gameOver,`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game/high-score.spec.ts`
Expected: `Tests  7 passed (7)`

- [ ] **Step 7: Verify the whole project**

Run: `npx prettier --write src/app/game/state.ts src/app/game/high-score.ts src/app/game/high-score.spec.ts src/app/game/rules.ts`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  39 passed (39)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 8: Commit**

```bash
git add src/app/game/state.ts src/app/game/high-score.ts src/app/game/high-score.spec.ts src/app/game/rules.ts
git commit -m "feat: high score rule step"
```

---

### Task 2: Persist the best score and show it on game over

**Files:**
- Modify: `src/app/game-canvas/game-canvas.ts` (module-level storage helpers, a `best` field and the `step()` method of `GameCanvas`)
- Modify: `src/app/game-canvas/game-canvas.html` (inside `<p data-testid="message">`)
- Modify: `src/app/game-canvas/game-canvas.spec.ts` (nested `describe('high score')` appended inside `describe('GameCanvas')`)

**Interfaces:**
- Consumes: `GameState.best`, `GameState.isNewBest`, `recordHighScore` already in `RULES` (Task 1); v1 `tick`, `GameCanvas.step(dtMs)`, `GameCanvas.state` signal; in the spec, the existing `fixture`, `component`, `text(fixture, id)` helper and imports (`TestBed`, `GameCanvas`, `withState`) — add `HEIGHT` to the existing `'../game/state'` import.
- Produces (in `src/app/game-canvas/game-canvas.ts`, none exported):
  - `const BEST_KEY = 'star-catcher.best';`
  - `function readBest(): number` — `Number(localStorage.getItem(BEST_KEY))`; returns it if `Number.isSafeInteger(n) && n > 0`, else `0`; returns `0` if storage throws.
  - `function writeBest(best: number): void` — `localStorage.setItem(BEST_KEY, String(best))`; if storage throws, keep playing. The catch block must hold a comment (ESLint `no-empty`), e.g. `// storage unavailable (private mode): the best lasts for this session`.
  - `private best = readBest();` on `GameCanvas`.
  - `step(dtMs)` calls `tick({ ...this.state(), best: this.best }, input, dtMs)`; then, if the result has `isNewBest && best > this.best`, sets `this.best` to it and calls `writeBest`; then `this.state.set(result)` and `this.draw()` as before.

- [ ] **Step 1: Write the failing tests** — append inside `describe('GameCanvas', …)` in `src/app/game-canvas/game-canvas.spec.ts`:

```ts
  describe('high score', () => {
    const missedStar = { id: 0, kind: 'star' as const, x: 10, y: HEIGHT, speed: 0.18 };
    const lastLife = (score: number) =>
      withState({ lives: 1, score, basketX: 400, objects: [missedStar] });

    async function createGame() {
      const game = TestBed.createComponent(GameCanvas);
      game.componentRef.setInput('seed', 1);
      await game.whenStable();
      return game;
    }

    afterEach(() => localStorage.removeItem('star-catcher.best'));

    it('shows Best and New best! on game over', async () => {
      component.state.set(
        withState({ status: 'over', score: 7, lives: 0, best: 7, isNewBest: true }),
      );
      await fixture.whenStable();
      expect(text(fixture, 'best')).toBe('Best: 7');
      expect(text(fixture, 'new-best')).toBe('New best!');
    });

    it('hides New best! when the record stands', async () => {
      component.state.set(
        withState({ status: 'over', score: 7, lives: 0, best: 9, isNewBest: false }),
      );
      await fixture.whenStable();
      expect(text(fixture, 'best')).toBe('Best: 9');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[data-testid="new-best"]'),
      ).toBeNull();
    });

    it('saves a new best to localStorage', () => {
      component.state.set(lastLife(5));
      component.step(16);
      expect(component.state().status).toBe('over');
      expect(component.state().isNewBest).toBe(true);
      expect(localStorage.getItem('star-catcher.best')).toBe('5');
    });

    it('loads the stored best and does not flag a lower score', async () => {
      localStorage.setItem('star-catcher.best', '12');
      const game = await createGame();
      game.componentInstance.state.set(lastLife(5));
      game.componentInstance.step(16);
      expect(game.componentInstance.state().best).toBe(12);
      expect(game.componentInstance.state().isNewBest).toBe(false);
      expect(localStorage.getItem('star-catcher.best')).toBe('12');
      game.destroy();
    });

    it('ignores an invalid stored value', async () => {
      localStorage.setItem('star-catcher.best', 'abc');
      const game = await createGame();
      game.componentInstance.state.set(lastLife(3));
      game.componentInstance.step(16);
      expect(game.componentInstance.state().best).toBe(3);
      expect(game.componentInstance.state().isNewBest).toBe(true);
      game.destroy();
    });

    it('keeps working when storage is unavailable', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      const game = await createGame();
      game.componentInstance.state.set(lastLife(5));
      game.componentInstance.step(16);
      expect(game.componentInstance.state().best).toBe(5);
      expect(game.componentInstance.state().isNewBest).toBe(true);
      game.destroy();
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: FAIL — `shows Best and New best! on game over` fails with `expected '' to be 'Best: 7'`, and `saves a new best to localStorage` fails with `expected null to be '5'`.

- [ ] **Step 3: Implement storage in `game-canvas.ts`** — the members listed under Produces.

- [ ] **Step 4: Implement the overlay in `game-canvas.html`** — inside `<p data-testid="message">`, directly after `{{ message() }}` and before the `@if (restartHint())` block:

```html
@if (state().status === 'over') {
  <br /><span data-testid="best">Best: {{ state().best }}</span>
  @if (state().isNewBest) {
    <br /><span data-testid="new-best">New best!</span>
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game-canvas/game-canvas.spec.ts`
Expected: `Tests  11 passed (11)`

- [ ] **Step 6: Verify the whole project**

Run: `npx prettier --write src/app/game-canvas`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  45 passed (45)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 7: Commit**

```bash
git add src/app/game-canvas/game-canvas.ts src/app/game-canvas/game-canvas.html src/app/game-canvas/game-canvas.spec.ts
git commit -m "feat: persist best score and show it on game over"
```
