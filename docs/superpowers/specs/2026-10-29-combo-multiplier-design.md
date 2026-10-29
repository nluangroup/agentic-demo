# Star Catcher — Combo Multiplier Design

Date: 2026-10-29
Status: Draft for owner review
Parent spec: `docs/superpowers/specs/2026-10-29-star-catcher-demo-design.md`
Plan: `docs/superpowers/plans/2026-10-29-combo-multiplier.md`
Runs: **live**, on stage, headless, in ~10 minutes

## Intent

Reward catching stars in a row. The audience sees `×2`, `×3`… pop up over the
basket and the score jump faster, the moment the run finishes.

## Goals

- Consecutive `caught` events build a combo. Multiplier = `1 + floor(combo / 3)`,
  capped at **5**.
- A `missed` or `hitRock` event resets the combo to 0.
- Each caught star scores the multiplier (the star that raises the combo scores
  at the new multiplier: catches 1–2 score 1, catch 3 scores 2).
- When the multiplier rises, an overlay `×N` pops up near the basket for
  **600 ms**.
- On-screen result: catching three stars in a row shows `×2` above the basket and
  the third star adds 2 to the score.

## Non-goals

- A permanent combo counter in the HUD, sounds, animations beyond show/hide.
- Changing v1 scoring for the first two stars of a combo.

## Anti-goals

- The smallest plan of the four: no new object kind, no new event type, no edits
  to existing step files.
- Timing in the component (`setTimeout`, wall clock). The pop lifetime is game
  state so tests stay deterministic.

## Constraints

- Rules stay pure in `src/app/game/combo.ts`, one step registered in
  `rules.ts` directly after `collide` (it reads that tick's events).
- `collide` already adds +1 per star; the combo step adds `multiplier − 1`.
- New state fields reset on restart through `initialState`.
- Overlay is a DOM element with `data-testid="combo-pop"`.

## Decided

- State fields `combo` and `comboPopMs`; the multiplier is derived, not stored.
- Events are processed in order; a pop happens only if the multiplier after the
  tick's events is higher than before.
- The pop counts down by `dt` every tick, also after game over.

## Left to the builder

- Pop styling (colour, size), within "near the basket, readable".

## Merge notes

A golden catch also counts toward the combo (`applyCombo` adds `multiplier − 1`
on top of golden's +2); intended. Expected trivial conflicts: `state.ts` new
fields after `events` and in `initialState`, and `rules.ts` registration after
`collide` (`applyCombo` vs. `goldenStar`); keep both.
