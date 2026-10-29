# Star Catcher — Demo Repo Design

Date: 2026-10-29
Status: Draft for review
Companion to: `nluangroup/jira` → `docs/superpowers/specs/2026-10-29-claude-jira-queue-design.md`
(the queue service that runs plans against this repo)

## Intent

`nluangroup/agentic-demo` is the code the queue service changes during the
30-minute "AI-native engineering" demo. It must:

- be **visibly** changed by each plan, so colleagues see results, not diffs;
- be small enough that a one- or two-task plan completes in ~10 minutes;
- carry the owner's real engineering harness (verify contract, project rules,
  headless permissions), so the demo shows how the owner actually works.

The owner chose a **game**: an original browser game, "Star Catcher", plus a
series of improvement plans, each of which adds something you can see while
playing. It is deliberately unrelated to the talk's subject — "just an example
with a real function".

## Goals

- A playable v1 game in the repo before the demo.
- One short, prepared, approved plan for the **live** run (combo multiplier).
- Three prepared plans run **overnight** before the demo (high score,
  difficulty ramp, golden-star power-up), leaving unmerged PRs and Jira cards
  in In Review.
- A "queue this plan" skill that turns the current Superpowers plan into a
  SCRUM card the service can run.
- A `verify.ps1` the service runs independently, following the owner's verify
  contract.
- Project rules and permissions that let a headless `claude -p` run complete a
  plan without prompts or stalls.

## Non-goals

- A back end, accounts, multiplayer, persistence beyond the browser.
- Mobile/touch controls (keyboard + mouse only).
- Deployment or hosting; PR preview environments.
- Pixel art, sprites, audio. Shapes drawn on canvas are enough.
- Recreating any existing commercial game.

## Anti-goals

- A plan run that stalls on a permission prompt or a question.
- A green `verify` on a game that is visibly broken (e.g. blank canvas).
- Game logic that can only be checked by playing it (untestable rules).
- Improvements that touch the same files as each other so heavily that the
  overnight PRs and the live PR conflict on stage.

## The game (v1)

- A canvas, fixed logical size 480×640, scaled to fit the viewport.
- A basket at the bottom, moved with ←/→ (or A/D) and with the mouse.
- Stars fall from the top at random x; catching one scores +1.
- Missing a star costs a life; 3 lives. Rocks fall occasionally; catching a rock
  costs a life.
- Game over screen with score and "Press Space to play again".
- Spawns use a seedable random source so tests are deterministic.

### Architecture

- Angular 22, standalone components, signals. Vitest for tests (Angular's
  default runner in v22). No back end.
- **Rules are pure TypeScript, separate from rendering:**
  - `game/state.ts` — `GameState` (basket, falling objects, score, lives,
    status, elapsed time) and `initialState(seed)`.
  - `game/tick.ts` — `tick(state, input, dtMs): GameState`, the only place
    rules change state. Pure, no DOM, no `Math.random` (uses the seeded
    source carried in state).
  - `game/rng.ts` — small seeded PRNG.
- **Rendering and input** in one component, `GameCanvasComponent`: a
  `requestAnimationFrame` loop that reads input, calls `tick`, and draws the
  state. The **HUD (score, lives, status text) is a DOM overlay**, not canvas
  text, so tests and the smoke check can read it. Feature overlays (e.g. the
  combo pop-up) follow the same pattern.
- **Start screen:** the game opens on "Press Space to start" with the HUD
  showing `Score: 0`; Space starts play. (The smoke check relies on this.)
- **`tick` is a pipeline of rule steps:** `tick` runs an ordered array of step
  functions (`(state, input, dt) => state`) declared in one place
  (`game/rules.ts`). Each improvement adds its own module under `game/` (e.g.
  `game/combo.ts`) with its own tests and registers one step in that array,
  plus, if it shows something, one overlay element. This keeps plans small and
  their edits on separate lines.
- Pin the Angular version installed on the presenter's machine (CLI 22.2.5,
  Node 24.18.0 — checked 2026-10-29) in `package.json`; generate with that CLI.

## Improvement plans

| Plan | What appears on screen | When it runs |
|---|---|---|
| Combo multiplier | "×2", "×3"… pops up on consecutive catches; score uses the multiplier; a miss resets it | **Live** |
| High score | Best score stored in `localStorage`, shown on game over ("New best!") | Overnight |
| Difficulty ramp | Fall speed and spawn rate rise with score | Overnight |
| Golden star power-up | Rare golden star; catching it slows everything for 5 s with a visible countdown | Overnight |

All four specs + plans are written by Claude with Superpowers as part of this
work (owner's decision) and reviewed by the owner before any is queued. They
are written after v1 exists, against v1's actual code. The live plan is at most two tasks
(rule module + tests; wire into tick and rendering) so it fits ~10 minutes;
its real duration is measured in rehearsal.

Overnight PRs stay unmerged until after the demo. **No PR is merged on
stage** — the live PR is only shown (and played via `play.ps1`). All plans are
written against v1. Plan and spec documents are committed to `main` during
preparation; no game code lands on `main` after v1 until the demo is over, so
every card's commit contains v1 code and the plans can be queued in any order.
Merging the four PRs afterwards may need small manual conflict resolution in
`game/rules.ts` and the overlay template; that is acceptable.

## `verify.ps1`

Follows the owner's verification contract: one entry point, exits 0 only when
everything required passed, and prints one line per check as `PASS: <check>`,
`FAIL: <check> — <fix hint>` or `SKIPPED: <check> — <reason>`. Never conflates
the three.

Checks, in order:
1. `npm ci` if `node_modules` is missing (not a reported check).
2. Format check (Prettier `--check`).
3. Lint (ESLint, Angular config).
4. Build (`ng build`), warnings as errors where the toolchain allows.
5. Unit tests (Vitest, single run, no watch).
6. **Smoke render** — Playwright (Chromium) against the **built** `dist/`
   served by a tiny static server (not `ng serve`): the canvas has
   non-background pixels and the overlay shows `Score: 0` on the start screen.
   Guards the "green verify, blank game" anti-goal. The Playwright browser is
   installed once on the presenter's machine during preparation and never
   downloaded inside a run; if it is missing, this check prints `SKIPPED`
   (and the queue service shows it on the card).

Time budget: `verify.ps1` should finish in under ~2 minutes on the
presenter's machine including `npm ci` in a fresh clone (npm's cache makes
that fast after the first time). Measured in rehearsal.

**Output contract for the service:** `verify.ps1` prints the Vitest summary
lines unchanged to stdout (in addition to its own `PASS:`/`FAIL:`/`SKIPPED:`
lines), because the queue service reads test counts from them.

`-Full` is not needed for the demo.

### Dependency on the queue service

The service's test-count parser currently understands only `dotnet test`
summary lines, so a Vitest run would show "Tests: no summary". **Change in
`nluangroup/jira`:** teach `TestSummaryParser` Vitest's summary
(`Tests  <n> passed (<total>)`, and the `<f> failed | <p> passed (<total>)`
form). `TestSummaryParser` already exists there with tests
(`src/ClaudeQueue/Verify/IVerifier.cs`, `tests/ClaudeQueue.Tests/Verify/`);
extend it, keeping the `dotnet test` format working. Done on a branch in the
local clone `C:\Users\nlu\jira`, merged and pushed with the owner's OK like
the service itself.

## Project `CLAUDE.md`

Overrides the owner's global workflow for this repo (the global file will be
the owner's work `CLAUDE.md`, linked into the personal setup):

- When executing a Superpowers plan (headless queue runs or interactive), the
  Superpowers workflow replaces the global Default Workflow and Review
  Escalation, including its 2-iteration halt.
- Implementers may commit on the plan branch (overrides "subagents never
  perform git operations" for plan runs). Never push; never touch `main`.
- Frontend implementers write their own Vitest tests; no separate test agent.
- Deferred findings go into the run's final summary (the queue posts it on the
  card), not into `TODO.md`.
- `verify.ps1` is the definition of done; run it before every commit.
- Game rules stay pure and tested in `game/`; rendering stays in the
  component.

## Headless permissions — `.claude/settings.json`

Checked in. The service already runs Claude with `--permission-mode dontAsk`
(anything not allowed is denied, never prompted) and `--disallowedTools
"Bash(git push:*)"`; this file supplies the allowlist. No network installs
inside a run beyond `npm ci` (Playwright browsers are preinstalled). An
allowlist sufficient for an unattended plan run:
file reads/edits/writes; the subagent tool; `npm`/`npx`/`ng` commands;
`pwsh ./verify.ps1`; local `git` operations (status, diff, log, add, commit,
rev-parse, branch --show-current, stash); and the Superpowers helper scripts
(which run under Git Bash). `git push` is denied here as well as by the
service's `--disallowedTools`. Completeness is proven by rehearsal — a run
that hits a denied tool must show up in the run log, and the list is fixed
until two consecutive rehearsals complete without one.

## "Queue this plan" skill

A project skill at `.claude/skills/queue-plan/SKILL.md`, used interactively in
Claude CLI at the end of a planning session ("queue this plan"):

1. Find the current plan under `docs/superpowers/plans/` and its spec.
2. Make sure both are committed and pushed to `origin/main` — ask before
   committing or pushing.
3. Create a Task in Jira project `SCRUM` (site
   `https://nlundgaard.atlassian.net`) through the Atlassian connector, in
   **To Do**, with the plan title as summary and a description that contains,
   as **plain lines at the start of a line** (no bullets, no bold, no code
   formatting):
   ```
   Queue-Repo: nluangroup/agentic-demo
   Queue-Plan: <plan path>
   Queue-Commit: <full 40-char SHA>
   ```
   plus a one-paragraph human summary. Write each `Queue-…` line as its own
   paragraph (blank line between) so the connector cannot merge them into one
   line.
4. **Read the card back** (via the connector) and check that the three values
   parse with the same rules the service uses (key at line start, optional
   bullet/bold, full SHA). If they don't, say so and fix the description
   before telling the owner it's queued.
5. Reply with the card link and a reminder: "Drag it to Ready for Claude to
   approve."

Validated once against the real SCRUM board during the build (one test card,
left in To Do and deleted or closed afterwards).

## Seeing the result on stage

`play.ps1 [<branch>]` at the repo root: fetches, checks out the branch (default
`main`) in a separate worktree under the system temp directory, installs if
needed, and starts `ng serve --open`. The presenter runs it before the run (v1
or overnight branch) and after the run (the live PR branch). A worktree keeps
the presenter's own checkout untouched.

## Preparation sequence (for the plan)

1. Repo scaffold, v1 game, `verify.ps1`, project `CLAUDE.md`,
   `.claude/settings.json`, `play.ps1`, README — committed to `main`.
2. Service change in `nluangroup/jira`: Vitest summary parsing.
3. The queue skill.
4. The four improvement specs + plans, reviewed by the owner.
5. Rehearsals: run the live plan through the queue twice, timing it, fixing
   permissions; then run the three overnight plans.

## Decided by the owner

- The demo app is a game; improvements are separate plans that add visible
  features.
- Live improvement: a new on-screen feature appearing (combo multiplier).
- Unrelated to the talk's subject.
- Claude writes all four improvement specs and plans; the owner reviews them.

## Designer's calls (owner to check)

- Game concept and name ("Star Catcher"), v1 feature set, 480×640 canvas.
- Angular 22 + Vitest, no back end; rules as pure TypeScript with a seeded RNG.
- The four improvement plans and which one runs live.
- The smoke-render check in `verify.ps1`, reported as SKIPPED when no
  headless browser is available.
- Vitest summary parsing added to the queue service.
- `play.ps1` with a temp worktree to show branches on stage.
- Project `CLAUDE.md` lets implementers commit during plan runs.
- HUD as a DOM overlay; a start screen; `tick` as a registered pipeline of
  rule steps so features land on separate lines.
- No PR merged on stage; all plans written against v1; small conflicts when
  merging afterwards are acceptable.
- Smoke check runs Playwright against built `dist/`; browsers preinstalled;
  `verify.ps1` passes Vitest's summary through for the service.
- The queue skill writes each `Queue-…` line as its own paragraph and reads
  the card back to confirm it parses; validated once with a real test card.

## Left to the builder

- Exact visuals (colours, shapes, fonts), spawn rates and speeds for v1.
- Choice of PRNG algorithm and headless-browser tool for the smoke check
  (Playwright is acceptable).
- ESLint/Prettier configuration details.
- Wording of the skill and project `CLAUDE.md`, within the rules above.
