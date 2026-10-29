# Star Catcher — Golden Star Power-up Design

Date: 2026-10-29
Status: Draft for owner review
Parent spec: `docs/superpowers/specs/2026-10-29-star-catcher-demo-design.md`
Plan: `docs/superpowers/plans/2026-10-29-golden-star.md`
Runs: overnight, headless

## Intent

A rare, recognisable bonus: catch a golden star and everything slows down for
a few seconds, with a visible countdown.

## Goals

- Spawn kind `golden` with probability **0.04** per spawn.
- Catching it scores **+3** and sets `slowMoMs = 5000`.
- While `slowMoMs > 0` all fall speeds are halved.
- HUD shows a countdown `Slow-mo 4.2s` while active.
- On-screen result: an orange star occasionally falls; catching it adds 3 points
  and shows `Slow-mo 5.0s` counting down while everything falls at half speed.

## Non-goals

- Other power-ups, stacking timers, slowing spawns or the basket.

## Anti-goals

- A golden star treated as a rock by code that assumed only two kinds.

## Constraints

- Adds `'golden'` to `ObjectKind`. There are no `switch` statements on kind in
  v1; the if/else branches on kind are in `steps/collide.ts`, `steps/spawn.ts`
  and `game-canvas/game-canvas.ts` (`drawObject`), and each is updated.
- Rule module `src/app/game/golden-star.ts`, one step registered in `rules.ts`
  directly after `collide` (it reads that tick's `caught` events).
- `collide` scores +1 for a caught golden star (like a star); the step adds +2.

## Decided

- Spawn kind from the existing kind roll: `< 0.15` rock, `< 0.19` golden, else
  star (the star share drops from 85 % to 81 %).
- Missing a golden star costs nothing and emits no event.
- Halving lives in `fall` through `fallRate(state)` from the golden-star module.
- Catching another golden star while active restarts the timer at 5000.
- Countdown text rounds up to tenths: 4150 ms shows `Slow-mo 4.2s`.

## Left to the builder

- Nothing beyond the golden fill colour `#ff8c00`, fixed by the plan.

## Merge notes

- After merging with the difficulty ramp: multiply the ramp's extra distance in
  `rampDifficulty` by `fallRate(state)` so slow-mo also halves ramped speed.
- A golden catch also counts toward the combo: combo adds `multiplier − 1` on
  top of golden's +2. Intended.
- Expected trivial conflicts: `spawn.ts` lines 5–6 (difficulty's
  `SPAWN_INTERVAL_MS` export vs. golden's constant); `state.ts` new fields after
  `events` and in `initialState` (combo, high score, golden); `rules.ts`
  registration after `collide` (`goldenStar` vs. combo's `applyCombo`). Keep
  both sides each time.
