# Star Catcher — Difficulty Ramp Design

Date: 2026-10-29
Status: Draft for owner review
Parent spec: `docs/superpowers/specs/2026-10-29-star-catcher-demo-design.md`
Plan: `docs/superpowers/plans/2026-10-29-difficulty-ramp.md`
Runs: overnight, headless

## Intent

v1 never gets harder. Make the game speed up as the player scores so a round
ends on its own.

## Goals

- Fall speed × `(1 + 0.05 · floor(score / 5))`, capped at ×2 (reached at 100).
- Spawn interval `700 − 40 · floor(score / 5)` ms, floor 350 ms (reached at 45).
- On-screen result: as the score climbs, objects fall visibly faster and arrive
  more often.

## Non-goals

- A HUD level indicator, difficulty settings, slowing down again.

## Anti-goals

- Edits that collide with other improvement plans: no changes to `fall.ts`,
  `collide.ts` or the component.

## Constraints

- Rule module `src/app/game/difficulty.ts`, one step registered in `rules.ts`
  directly after `fall`.
- Only change to an existing step: `spawn.ts` exports its `SPAWN_INTERVAL_MS`
  constant (base interval 700 lives in one place).

## Decided

- The step scales the tick's movement, not the stored `speed`: after `fall`
  moved each object by `speed · dt`, it adds `speed · dt · (factor − 1)`.
- The step speeds up the spawn countdown: it subtracts an extra
  `dt · (700 / interval − 1)` from `spawnCooldownMs`, so a spawn happens every
  `interval` ms of play.
- Score 0–4 is v1 behaviour exactly (step returns the same state).

## Left to the builder

- Nothing visual.
