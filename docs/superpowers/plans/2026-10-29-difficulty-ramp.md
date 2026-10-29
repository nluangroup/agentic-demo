# Difficulty Ramp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make objects fall faster (×(1 + 0.05·floor(score/5)), cap ×2) and spawn more often (700 − 40 ms per 5 points, floor 350 ms) as the score rises.

**Architecture:** A pure rule module `src/app/game/difficulty.ts` exports the two curves and one step, `rampDifficulty`, registered in `RULES` directly after `fall`. The step does not touch stored speeds or `spawn`: it adds the extra distance `speed · dt · (factor − 1)` to each object after `fall` has moved it, and subtracts an extra `dt · (700 / interval − 1)` from `spawnCooldownMs` so the cooldown runs out every `interval` ms. The only edit to existing code is exporting `SPAWN_INTERVAL_MS` from `spawn.ts`. Nothing changes in the component: the effect is visible in play.

**Tech Stack:** Angular 22, TypeScript, Vitest via `ng test`, Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-29-difficulty-ramp-design.md`

**On-screen result:** As the score climbs, stars and rocks fall visibly faster and arrive more often, up to twice the v1 speed and rate.

## Global Constraints

- Work on the current branch. Do not push, create branches or worktrees, merge, or open PRs. Do not edit `docs/superpowers/**`, `.claude/**`, `verify.ps1`, `tools/smoke.mjs`, and do not read or write `TODO.md`.
- Rules are pure TypeScript in `src/app/game/`: no DOM, no `Math.random`, no `Date.now`. A step returns a new state object when it changes something and the **same** object when it changes nothing.
- Speed factor `1 + 0.05 · Math.floor(score / 5)`, at most **2**. Spawn interval `700 − 40 · Math.floor(score / 5)` ms, at least **350** ms. Score 0–4 behaves exactly like v1.
- Do not edit `src/app/game/steps/fall.ts`, `steps/collide.ts` or anything in `src/app/game-canvas/`. In `steps/spawn.ts` the only change is adding `export` to `const SPAWN_INTERVAL_MS = 700;`.
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

- **Low scores:** score 0–4 must be byte-for-byte v1 (same state object returned), or the v1 tests and feel change. Test: `score 0–4 leaves the state untouched`.
- **Very high scores:** the factor stops at ×2 and the interval at 350 ms; nothing keeps accelerating. Test: `speedFactor …` and `spawnIntervalMs …` cases for 100 and 200 / 45 and 100.
- **The ramp reaches the screen:** the step must be in `RULES`, after `fall` and before `collide`, so the extra distance counts for catching. Tests: `runs right after fall in RULES`, `through tick, score 100 falls twice as fast`.
- **Spawn rate end to end:** at score 100 a second of play spawns twice where v1 spawns once. Test: `through tick, score 100 spawns every 350 ms`.
- **Ready / game-over screens:** nothing moves or counts down unless playing. Test: `does nothing unless playing`.

---

## File Structure

```
src/app/game/difficulty.ts        NEW speedFactor(), spawnIntervalMs(), rampDifficulty step
src/app/game/difficulty.spec.ts   NEW Vitest
src/app/game/rules.ts             register rampDifficulty directly after fall
src/app/game/steps/spawn.ts       export SPAWN_INTERVAL_MS (one word)
```

---

### Task 1: Difficulty rule module

**Files:**
- Create: `src/app/game/difficulty.ts`
- Create: `src/app/game/difficulty.spec.ts`
- Modify: `src/app/game/rules.ts` (`RULES` array and imports)
- Modify: `src/app/game/steps/spawn.ts:5` (`const SPAWN_INTERVAL_MS = 700;` → `export const SPAWN_INTERVAL_MS = 700;`)

**Interfaces:**
- Consumes (v1): `GameState` from `src/app/game/state.ts`; `RuleStep`, `RULES` from `src/app/game/rules.ts`; `fall` from `src/app/game/steps/fall.ts`; `SPAWN_INTERVAL_MS` from `src/app/game/steps/spawn.ts` (exported by this task); `tick` from `src/app/game/tick.ts`; `noInput`, `withState(partial)` from `src/app/game/testing.ts`.
- Produces (in `src/app/game/difficulty.ts`):
  - `export function speedFactor(score: number): number` — `Math.min(1 + 0.05 * Math.floor(score / 5), 2)`.
  - `export function spawnIntervalMs(score: number): number` — `Math.max(SPAWN_INTERVAL_MS - 40 * Math.floor(score / 5), 350)`.
  - `export const rampDifficulty: RuleStep` — returns `state` unless `status === 'playing'`; with `factor = speedFactor(score)` and `interval = spawnIntervalMs(score)`: returns `state` when `factor === 1 && interval === SPAWN_INTERVAL_MS`; otherwise returns `{ ...state, objects: objects mapped to y + speed * dtMs * (factor - 1), spawnCooldownMs: spawnCooldownMs - dtMs * (SPAWN_INTERVAL_MS / interval - 1) }`.

- [ ] **Step 1: Write the failing tests** — create `src/app/game/difficulty.spec.ts`:

```ts
import { rampDifficulty, spawnIntervalMs, speedFactor } from './difficulty';
import { RULES } from './rules';
import { fall } from './steps/fall';
import { noInput, withState } from './testing';
import { tick } from './tick';

describe('difficulty', () => {
  it('speedFactor is 1 + 0.05 per 5 points, capped at 2', () => {
    const cases: [number, number][] = [
      [0, 1],
      [4, 1],
      [5, 1.05],
      [19, 1.15],
      [99, 1.95],
      [100, 2],
      [200, 2],
    ];
    for (const [score, factor] of cases) {
      expect(speedFactor(score)).toBeCloseTo(factor);
    }
  });

  it('spawnIntervalMs drops 40 ms per 5 points, floor 350', () => {
    expect([0, 4, 5, 44, 45, 100].map(spawnIntervalMs)).toEqual([700, 700, 660, 380, 350, 350]);
  });

  it('score 0–4 leaves the state untouched', () => {
    const state = withState({
      score: 4,
      objects: [{ id: 0, kind: 'star', x: 0, y: 100, speed: 0.2 }],
    });
    expect(rampDifficulty(state, noInput, 50)).toBe(state);
  });

  it('moves objects the extra distance', () => {
    const state = withState({
      score: 10,
      objects: [{ id: 0, kind: 'star', x: 0, y: 100, speed: 0.2 }],
    });
    expect(rampDifficulty(state, noInput, 50).objects[0]?.y).toBeCloseTo(101);
  });

  it('speeds up the spawn countdown', () => {
    const next = rampDifficulty(withState({ score: 10, spawnCooldownMs: 600 }), noInput, 50);
    expect(next.spawnCooldownMs).toBeCloseTo(600 - 50 * (700 / 620 - 1));
  });

  it('does nothing unless playing', () => {
    const state = withState({ status: 'over', score: 50 });
    expect(rampDifficulty(state, noInput, 50)).toBe(state);
  });

  it('runs right after fall in RULES', () => {
    expect(RULES.indexOf(rampDifficulty)).toBe(RULES.indexOf(fall) + 1);
  });

  it('through tick, score 100 falls twice as fast', () => {
    const state = withState({
      score: 100,
      objects: [{ id: 0, kind: 'star', x: 0, y: 100, speed: 0.18 }],
    });
    expect(tick(state, noInput, 50).objects[0]?.y).toBeCloseTo(118);
  });

  it('through tick, score 100 spawns every 350 ms', () => {
    const countSpawns = (score: number): number => {
      let state = withState({ score });
      for (let i = 0; i < 20; i++) {
        state = tick(state, noInput, 50);
      }
      return state.nextId;
    };
    expect(countSpawns(0)).toBe(1);
    expect(countSpawns(100)).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/game/difficulty.spec.ts`
Expected: FAIL — build error `Could not resolve "./difficulty"`.

- [ ] **Step 3: Export the base interval** — in `src/app/game/steps/spawn.ts` change `const SPAWN_INTERVAL_MS = 700;` to `export const SPAWN_INTERVAL_MS = 700;`. Nothing else in that file changes.

- [ ] **Step 4: Implement `src/app/game/difficulty.ts`** — the three exports in the Interfaces block, with `import type { RuleStep } from './rules';` and `import { SPAWN_INTERVAL_MS } from './steps/spawn';`.

- [ ] **Step 5: Register the step** — in `src/app/game/rules.ts` add `import { rampDifficulty } from './difficulty';` and insert `rampDifficulty,` in `RULES` on its own line directly after `fall,` (before `collide,`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/game/difficulty.spec.ts`
Expected: `Tests  9 passed (9)`

- [ ] **Step 7: Verify the whole project**

Run: `npx prettier --write src/app/game/difficulty.ts src/app/game/difficulty.spec.ts src/app/game/rules.ts src/app/game/steps/spawn.ts`, then `pwsh -NoProfile -File ./verify.ps1`
Expected: exit code 0; Vitest prints `Test Files  11 passed (11)` and `Tests  41 passed (41)`; the five `PASS:` lines from Global Constraints.

- [ ] **Step 8: Commit**

```bash
git add src/app/game/difficulty.ts src/app/game/difficulty.spec.ts src/app/game/rules.ts src/app/game/steps/spawn.ts
git commit -m "feat: difficulty ramp rule step"
```
