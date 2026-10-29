# Star Catcher — High Score Design

Date: 2026-10-29
Status: Draft for owner review
Parent spec: `docs/superpowers/specs/2026-10-29-star-catcher-demo-design.md`
Plan: `docs/superpowers/plans/2026-10-29-high-score.md`
Runs: overnight, headless

## Intent

Give players a reason for "one more round": remember the best score in the
browser and celebrate beating it.

## Goals

- Best score persisted in `localStorage` under key `star-catcher.best`.
- The game-over overlay shows `Best: n`, and `New best!` when this game set it.
- On-screen result: after a game that beats the stored best, the game-over
  screen shows `Best: <score>` and `New best!`, and a page reload still shows
  that best on the next game over.

## Non-goals

- Leaderboards, names, server storage, a best score on the start screen.

## Anti-goals

- Storage access inside game rules. Rules stay pure: the component reads and
  writes `localStorage`; the rule step only records `isNewBest`.
- A broken game when storage is unavailable (private mode, blocked site data).

## Constraints

- Rule module `src/app/game/high-score.ts`, one step registered in `rules.ts`
  after `gameOver` (it needs `status === 'over'`).
- No edits to existing step files. Restart resets the state through
  `initialState`, so the component re-supplies `best` before every tick.
- Overlay elements `data-testid="best"` and `data-testid="new-best"`.

## Decided

- State fields `best` (number) and `isNewBest` (boolean).
- A new best needs `score > best` (equal is not new; a 0-point game never is).
- Invalid or missing stored values read as 0; storage exceptions are ignored.

## Left to the builder

- Line layout inside the game-over message.
