# Star Catcher Demo Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `nluangroup/agentic-demo` into the demo target: a playable Angular game (Star Catcher v1) with a verify contract, headless-run rules and permissions, a "queue this plan" skill, a `play.ps1` launcher, four reviewed improvement plans, and the small Vitest-summary change in the queue service.

**Architecture:** Game rules are pure TypeScript in `src/app/game/` — a seeded RNG, an immutable `GameState`, and `tick()` that runs an ordered list of rule steps from `rules.ts`. One canvas component renders state and owns input and the animation loop; the HUD is a DOM overlay. `verify.ps1` gates format, lint, build, unit tests and a Playwright smoke render of the built app.

**Tech Stack:** Angular CLI 22.2.5, Node 24.18.0, TypeScript, Vitest (Angular unit-test builder), ESLint (angular-eslint), Prettier, Playwright (Chromium), PowerShell 7. Queue-service change: .NET 10 / xUnit in `C:\Users\nlu\jira`.

**Spec:** `docs/superpowers/specs/2026-10-29-star-catcher-demo-design.md`

## Global Constraints

- Angular CLI **22.2.5**, pinned in `package.json`; Node 24.18.0. Standalone components and signals; no NgModules; no SSR; no back end.
- Game rules live only in `src/app/game/`, are pure (no DOM, no `Math.random`, no `Date.now`), and change state only through `tick(state, input, dtMs)`.
- `tick` runs the ordered step array exported from `src/app/game/rules.ts`; a feature registers exactly one step there.
- Canvas logical size **480×640**, scaled to fit the viewport. HUD text is DOM, not canvas.
- Start screen text `Press Space to start`; HUD shows `Score: <n>` and `Lives: <n>`; game over shows `Game over — Score: <n>` and `Press Space to play again`. Three lives.
- `verify.ps1` prints exactly one line per check: `PASS: <check>`, `FAIL: <check> — <fix hint>`, or `SKIPPED: <check> — <reason>`; exits 0 only if no FAIL. It also prints Vitest's summary lines unchanged.
- Never push from a plan run; nothing in this repo pushes except the owner (and the queue skill, after asking).
- Jira: site `https://nlundgaard.atlassian.net`, project `SCRUM`, card block lines `Queue-Repo:`, `Queue-Plan:`, `Queue-Commit:` (full 40-char SHA), each its own paragraph.

## Review Focus

- **Window resize / high-DPI screens**: the canvas stays 480×640 logical, crisp, and input maps to logical coordinates. Test in Task 3 (mouse x at scaled width maps to logical x).
- **Holding both arrow keys / mouse leaving the canvas**: basket stays inside 0..480 and doesn't jitter. Test in Task 2 (clamp) and Task 3 (mouseleave keeps last x).
- **Very long frame (tab in background, `dtMs` of seconds)**: objects must not tunnel through the basket or spawn a burst. `tick` clamps `dtMs` to 50 ms. Test in Task 2.
- **Space held down at game over**: restart happens once per key press, not every frame. Test in Task 3 (keydown repeat ignored).
- **Fresh clone without `node_modules`, or no Playwright browser**: `verify.ps1` installs dependencies itself and reports the smoke check as `SKIPPED`, not `FAIL`. Test in Task 4.

---

## File Structure

```
package.json / angular.json / tsconfig*.json      Angular CLI scaffold (Task 1)
eslint.config.js, .prettierrc, .prettierignore     lint/format (Task 1)
src/app/app.ts, app.html, app.css                  hosts <app-game-canvas> (Task 3)
src/app/game/rng.ts                                seeded PRNG (Task 2)
src/app/game/state.ts                              GameState, FallingObject, Input, initialState (Task 2)
src/app/game/rules.ts                              ordered RuleStep[] (Task 2)
src/app/game/steps/*.ts                            one file per v1 rule step (Task 2)
src/app/game/tick.ts                               tick() (Task 2)
src/app/game/*.spec.ts, steps/*.spec.ts            Vitest (Task 2)
src/app/game-canvas/game-canvas.ts|html|css|spec.ts  component (Task 3)
tools/smoke.mjs                                    Playwright smoke check (Task 4)
verify.ps1                                         verify contract (Task 4)
play.ps1                                           launch a branch on stage (Task 5)
CLAUDE.md, .claude/settings.json, README.md        rules, permissions, docs (Task 5)
.claude/skills/queue-plan/SKILL.md                 queue skill (Task 6)
docs/superpowers/specs|plans/…                     four improvement specs + plans (Task 8)
C:\Users\nlu\jira\…TestSummaryParser              Vitest summary (Task 7)
```

---

### Task 1: Angular scaffold, format and lint

**Files:** Create the CLI scaffold at repo root, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore` (CLI default plus `/dist`, `/coverage`, `/test-results`).

**Interfaces:** Produces npm scripts used by `verify.ps1`: `format:check` (`prettier --check .`), `lint` (`ng lint`), `build` (`ng build`), `test:ci` (`ng test --watch=false`).

- [ ] **Step 1:** `npx -y @angular/cli@22.2.5 new star-catcher --directory . --defaults --ssr=false --skip-git --style=css`. Confirm `package.json` pins `@angular/*` 22.2.x and the test builder is Vitest (`angular.json` → `test` target uses `@angular/build:unit-test`). If the CLI generated a Karma setup instead, stop and report BLOCKED.
- [ ] **Step 2:** `npx ng add @angular-eslint/schematics --skip-confirmation`; add Prettier as a dev dependency with `.prettierrc` `{ "singleQuote": true, "printWidth": 100 }` and `.prettierignore` covering `dist`, `coverage`, `.angular`, `node_modules`, `docs`, `package-lock.json`.
- [ ] **Step 3:** Add the four npm scripts above. Run `npx prettier --write .` once.
- [ ] **Step 4:** Run `npm run format:check`, `npm run lint`, `npm run build`, `npm run test:ci` — all succeed; record the Vitest summary line format exactly as printed (Task 7 needs it) in the report.
- [ ] **Step 5:** Commit `chore: scaffold Angular 22 app with lint, format and Vitest`.

---

### Task 2: Game rules core

**Files:** Create `src/app/game/rng.ts`, `state.ts`, `rules.ts`, `tick.ts`, `steps/start-restart.ts`, `steps/move-basket.ts`, `steps/spawn.ts`, `steps/fall.ts`, `steps/collide.ts`, `steps/game-over.ts`, and a `.spec.ts` beside each.

**Interfaces (produced, used by Task 3 and by every improvement plan):**

```ts
// rng.ts
export interface Rng { readonly seed: number }
export function nextRandom(rng: Rng): [value: number, next: Rng];   // value in [0,1)

// state.ts
export const WIDTH = 480, HEIGHT = 640;
export const BASKET_WIDTH = 80, BASKET_Y = 600, OBJECT_SIZE = 24;
export type Status = 'ready' | 'playing' | 'over';
export type ObjectKind = 'star' | 'rock';
export interface FallingObject { readonly id: number; readonly kind: ObjectKind; readonly x: number; readonly y: number; readonly speed: number }
export interface Input { readonly left: boolean; readonly right: boolean; readonly pointerX: number | null; readonly startPressed: boolean }
export interface GameEvent { readonly type: 'caught' | 'missed' | 'hitRock'; readonly kind: ObjectKind }
export interface GameState {
  readonly status: Status; readonly basketX: number; readonly objects: readonly FallingObject[];
  readonly score: number; readonly lives: number; readonly elapsedMs: number;
  readonly spawnCooldownMs: number; readonly nextId: number; readonly rng: Rng;
  readonly events: readonly GameEvent[];   // events produced during the current tick only
}
export function initialState(seed: number): GameState;   // status 'ready', basket centred, lives 3, score 0

// rules.ts
export type RuleStep = (state: GameState, input: Input, dtMs: number) => GameState;
export const RULES: readonly RuleStep[];   // order: startRestart, moveBasket, spawn, fall, collide, gameOver

// tick.ts
export const MAX_DT_MS = 50;
export function tick(state: GameState, input: Input, dtMs: number): GameState;
```

`tick` clears `events`, clamps `dtMs` to `[0, MAX_DT_MS]`, and folds `RULES` over the state. Steps other than `startRestart` do nothing unless `status === 'playing'`.

Rule values (v1): basket speed 0.5 px/ms by keys, or follows `pointerX` directly (basket centre = pointerX), clamped so the basket stays inside 0..WIDTH; spawn every 700 ms, x uniform in [0, WIDTH − OBJECT_SIZE], kind `rock` with probability 0.15, speed 0.18 px/ms; an object is caught when its bottom reaches `BASKET_Y` and it horizontally overlaps the basket; caught star → score +1 and event `caught`; caught rock → lives −1 and event `hitRock`; star passing `HEIGHT` → lives −1 and event `missed`; a rock passing `HEIGHT` is removed silently; lives 0 → status `over`. `startRestart`: in `ready` or `over`, `startPressed` → fresh `initialState(<current rng seed>)` with status `playing`.

- [ ] **Step 1: Write the failing tests** — one spec per file. Required cases:

```ts
// rng.spec.ts
it('is deterministic for a seed and in [0,1)', ...)            // same seed → same sequence of 5 values; all 0 <= v < 1
// tick.spec.ts
it('does nothing but wait in ready state', ...)                 // tick(initialState(1), noInput, 16) keeps status 'ready', objects []
it('starts on space and plays', ...)                            // startPressed → status 'playing'
it('clamps a long frame to 50 ms', ...)                         // dt 5000 moves a falling object by speed*50, spawns at most one
it('clears last tick events', ...)
// steps/move-basket.spec.ts
it('moves with keys and clamps to the field', ...)              // holding right for 2000 ms → basketX + BASKET_WIDTH/2 === WIDTH
it('follows the pointer', ...)                                  // pointerX 100 → basket centre 100
// steps/spawn.spec.ts
it('spawns every 700 ms with seeded positions', ...)            // two runs with seed 42 produce identical objects
// steps/collide.spec.ts
it('catching a star scores and emits caught', ...)
it('catching a rock costs a life and emits hitRock', ...)
it('a missed star costs a life and emits missed', ...)
it('a missed rock is removed without penalty', ...)
// steps/game-over.spec.ts
it('lives reaching 0 ends the game', ...)
it('space after game over restarts with score 0 and 3 lives', ...)
```

(Tests build states with a small `withState(partial)` helper in `src/app/game/testing.ts`.)

- [ ] **Step 2:** `npm run test:ci` → FAIL (modules missing).
- [ ] **Step 3:** Implement. Use mulberry32 for `nextRandom`.
- [ ] **Step 4:** `npm run test:ci` → PASS; `npm run lint` and `npm run format:check` clean.
- [ ] **Step 5:** Commit `feat: Star Catcher game rules as pure tested steps`.

---

### Task 3: Canvas component, HUD overlay, input and loop

**Files:** Create `src/app/game-canvas/game-canvas.ts`, `.html`, `.css`, `.spec.ts`; modify `src/app/app.ts`/`app.html`/`app.css` to show only `<app-game-canvas />` centred on a dark page with the title "Star Catcher".

**Interfaces:** Consumes Task 2. Produces `GameCanvasComponent` (selector `app-game-canvas`) with:
- `readonly state = signal<GameState>(initialState(seed))` — seed from `Date.now()` at construction, injectable for tests via an `@Input() seed?: number`.
- `step(dtMs: number): void` — reads current input, calls `tick`, sets `state`, draws. The rAF loop calls it; tests call it directly.
- Overlay elements with `data-testid`: `score` (`Score: n`), `lives` (`Lives: n`), `message` (start / game-over text per Global Constraints). Improvement plans add more overlay elements beside these.

Input: keydown/keyup for ArrowLeft/ArrowRight/A/D; Space sets `startPressed` for exactly one `step` per physical press (`event.repeat` ignored); pointer move maps client x to logical x via the canvas's bounding rect; pointerleave keeps the last x. The canvas element is 480×640 logical with `devicePixelRatio` backing-store scaling, CSS-scaled to fit the viewport height. Drawing: dark background `#0b1020`, stars as yellow 5-point stars, rocks as grey circles, basket as a rounded rectangle — the basket is drawn in every status, including `ready` (Task 4's smoke check relies on it). The rAF loop starts in `afterNextRender` and stops on destroy.

- [ ] **Step 1: Write the failing tests** (`game-canvas.spec.ts`, TestBed, `seed` input fixed):

```ts
it('shows the start screen with score 0', ...)        // message 'Press Space to start', score 'Score: 0', lives 'Lives: 3'
it('space starts the game once per press', ...)       // dispatch keydown Space (repeat false) → step(16) → status playing; keydown repeat true at game over does not restart
it('maps pointer x through the scaled canvas', ...)   // stub getBoundingClientRect width 240 → client x 120 → basket centre 240
it('keeps last pointer x after pointerleave', ...)
it('shows game over text with the score', ...)        // set state to over with score 7 → 'Game over — Score: 7' and 'Press Space to play again'
```

- [ ] **Step 2:** `npm run test:ci` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm run test:ci`, `lint`, `format:check`, `build` → all pass. Manually: `npx ng serve`, play one round, confirm it looks right (report what you saw).
- [ ] **Step 5:** Commit `feat: playable Star Catcher canvas with HUD overlay`.

---

### Task 4: verify.ps1 with Playwright smoke check

**Files:** Create `verify.ps1`, `tools/smoke.mjs`; add dev dependency `playwright` (library, not the test runner).

**Interfaces:** Produces the contract the queue service relies on (Global Constraints). Check names, in order: `format`, `lint`, `build`, `unit tests`, `smoke render`.

`verify.ps1`: PowerShell 7, ASCII only, `$ErrorActionPreference = 'Stop'` off for child processes (capture exit codes instead). If `node_modules` is missing run `npm ci` first (not a check line; on failure print `FAIL: install — npm ci failed` and exit 1). Run each check, capture its output, print the check's line; on FAIL also print the last 30 output lines indented. For `unit tests` print Vitest's own output lines unchanged (so the summary reaches the service). Set `MSBUILDDISABLENODEREUSE`-style hygiene where relevant: `CI=1` for npm. Exit 1 if any FAIL, else 0.

`tools/smoke.mjs` (Node ESM): serve `dist/star-catcher/browser` with a minimal `node:http` static server on a free port (SPA fallback to `index.html`), launch Chromium headless via `playwright`, open the page, wait for `[data-testid=score]`, assert its text is `Score: 0`, and assert the canvas has at least one pixel whose RGB differs from `#0b1020` by > 16 in any channel (read via `canvas.getContext('2d').getImageData` in the page — v1 draws the basket on the start screen). Exit codes: 0 pass, 1 fail (message on stderr), **2 when Chromium is not installed** (catch Playwright's "Executable doesn't exist" error). `verify.ps1` maps exit 2 to `SKIPPED: smoke render — Playwright Chromium not installed (run: npx playwright install chromium)`.

- [ ] **Step 1:** Install `playwright` dev dependency; run `npx playwright install chromium` once on this machine (this is the preparation-time install the spec allows).
- [ ] **Step 2:** Write `tools/smoke.mjs` and `verify.ps1`.
- [ ] **Step 3: Prove each sensor fires once** (owner's harness rule: break it on purpose before trusting it). For each, make the change, run `pwsh -NoProfile -File ./verify.ps1`, record the line, then restore with Edit (never `mv`/`cp -p`):
  - format: add `  ` trailing spaces in `app.ts` → `FAIL: format`
  - unit tests: flip one expected value in `rng.spec.ts` → `FAIL: unit tests`, Vitest summary shows 1 failed
  - smoke render: make the draw function return immediately → `FAIL: smoke render`
  - missing browser: run with `PLAYWRIGHT_BROWSERS_PATH` pointing at an empty temp dir → `SKIPPED: smoke render — …`, exit 0
  - fresh clone: `git clone` the repo into a temp dir and run `verify.ps1` there → installs, all PASS
- [ ] **Step 4:** Final clean run: all five `PASS`, exit 0, total time recorded in the report (target < 2 min including `npm ci` in the fresh clone).
- [ ] **Step 5:** Commit `feat: verify.ps1 contract with Playwright smoke render`.

---

### Task 5: Project rules, permissions, play.ps1, README

**Files:** Create `CLAUDE.md`, `.claude/settings.json`, `play.ps1`, `README.md`.

**`CLAUDE.md`** — states, as rules (no history, no dates):
1. This repo overrides the global workflow while a Superpowers plan is executed (headless or interactive): the Superpowers execution workflow replaces the global Default Workflow and Review Escalation, including the 2-iteration halt.
2. During plan runs, implementer subagents may commit on the current plan branch. Never push. Never commit to `main` in a plan run.
3. Frontend implementers write their own Vitest tests; no separate test agent.
4. `./verify.ps1` exiting 0 is the definition of done; run it before every commit. A `SKIPPED` line is reported, not ignored.
5. Game rules stay pure and tested under `src/app/game/`; a feature adds its own module and registers exactly one step in `rules.ts`; display goes in the component overlay.
6. Deferred review findings go into the final summary of the run (the queue posts it on the Jira card), not into `TODO.md`.
7. Do not run `ng serve` or any long-lived server in a plan run except inside `verify.ps1`.

**`.claude/settings.json`** — `permissions.allow` covering: `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Agent`, `Skill`, `TodoWrite`; `Bash(npm ci)`, `Bash(npm install:*)`, `Bash(npm run:*)`, `Bash(npx ng:*)`, `Bash(npx prettier:*)`, `Bash(npx vitest:*)`, `Bash(pwsh -NoProfile -File ./verify.ps1)`, `Bash(pwsh ./verify.ps1)`, `Bash(./verify.ps1)`, `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)`, `Bash(git rev-parse:*)`, `Bash(git branch --show-current)`, `Bash(git stash:*)`, `Bash(git show:*)`, `Bash(bash */superpowers/*/scripts/*)`, `Bash(ls:*)`, `Bash(cat:*)`, `Bash(mkdir:*)`; `PowerShell` equivalents for `npm`, `npx`, `git` read/commit and `./verify.ps1`. `permissions.deny`: `Bash(git push:*)`, `PowerShell(git push:*)`, `Bash(git checkout main)`, `Bash(git reset --hard:*)`. (Exact matcher syntax: check the installed Claude Code 2.1.312 docs via `claude --help`/settings schema; adjust patterns, keep the intent.) The list is completed by rehearsal later; record in the report which entries you could not validate.

**`play.ps1`** — `param([string]$Branch = 'main', [switch]$Local)` (`-Local` uses local `HEAD` instead of `origin/<branch>`, for use before anything is pushed): `git fetch origin`, create/refresh a worktree for `origin/$Branch` under `$env:TEMP\star-catcher-play\<branch with / → _>` (remove an existing one first with `git worktree remove --force` only if it lives under that folder), `npm ci` there if needed, then `npx ng serve --open --port 4300`. Prints which branch and commit it serves.

**`README.md`** — one screen: what the repo is (demo target for the Claude queue in `nluangroup/jira`), how to play (`./play.ps1` or `npm start`), `./verify.ps1`, the one-time `npx playwright install chromium`, where specs/plans live, and "queue this plan" (link to the skill file).

- [ ] **Step 1:** Write the four files.
- [ ] **Step 2:** `pwsh -NoProfile -File ./verify.ps1` still all PASS (Prettier ignores these or they are formatted).
- [ ] **Step 3:** `./play.ps1` (default `main` → it serves the pushed main; if main is not pushed yet, run with the current branch name after a local `git worktree` from HEAD — accept a `-Local` switch that uses `HEAD` instead of `origin/<branch>`). Confirm the game opens; stop the server.
- [ ] **Step 4:** Commit `docs: project rules, headless permissions, play launcher and README`.

---

### Task 6: "Queue this plan" skill

**Files:** Create `.claude/skills/queue-plan/SKILL.md`.

Frontmatter: `name: queue-plan`, `description:` "Use when the user says 'queue this plan' (or asks to add the current Superpowers plan to the Claude queue / Jira) in this repo — creates a SCRUM Jira card the Claude queue service can run."

Body (the behaviour from the spec's "Queue this plan" section, steps 1–5), including: how to find the current plan (the plan file most recently discussed, else the newest file in `docs/superpowers/plans/`; ask if ambiguous); check `git status` and `git log origin/main..HEAD` for the plan and its spec, and ask before committing/pushing; use the Atlassian connector tools (`createJiraIssue` with cloudId `2cf169bb-d580-472b-b2b0-49d9c66c6364`, project `SCRUM`, type `Task`); the exact description layout (human summary paragraph, then three separate paragraphs `Queue-Repo: nluangroup/agentic-demo`, `Queue-Plan: <path>`, `Queue-Commit: <sha>`); read back with `getJiraIssue` and check each line against the regex `^\s*(?:[*-]\s+)?\**queue-(repo|plan|commit)\**\s*:\s*\**(\S+?)\**\s*$` (case-insensitive, multiline) and SHA `^[0-9a-f]{40}$`; reply with the card link and "Drag it to Ready for Claude to approve."

- [ ] **Step 1:** Write the skill.
- [ ] **Step 2:** Commit `feat: queue-plan skill for the Claude Jira queue`.
- [ ] **Step 3 (controller, not the implementer): live validation.** With the owner's go-ahead, the controller runs the skill's Jira steps once against this repo's design doc as a stand-in plan, reads the card back, confirms the three values parse, reports the card key, then moves the card to Done or deletes it as the owner prefers. Fix the skill text if the round-trip fails.

---

### Task 7: Queue service reads Vitest summaries (`C:\Users\nlu\jira`)

**Files:** Modify `src/ClaudeQueue/Verify/IVerifier.cs` (`TestSummaryParser.Parse`), `tests/ClaudeQueue.Tests/Verify/TestSummaryParserTests.cs`, `README.md` (one line). Work on a new branch `feature/vitest-summary` from `origin/main` in that repo.

**Interfaces:** `TestSummaryParser.Parse(string output)` keeps its signature and `dotnet test` behaviour, and additionally recognises Vitest's summary line. Use the exact line format recorded in Task 1's report; expected shapes:
- `Tests  12 passed (12)` → (12, 0, 12)
- `Tests  1 failed | 11 passed (12)` → (11, 1, 12)
- with skips: `Tests  1 failed | 10 passed | 1 skipped (12)` → (10, 1, 12)
Leading whitespace and ANSI colour codes must be tolerated (strip `\x1b\[[0-9;]*m` first). Lines starting `Test Files` are ignored. When both dotnet and Vitest lines exist, sum them.

- [ ] **Step 1:** Write failing tests for the three shapes, one with ANSI codes, one with a `Test Files  2 passed (2)` line present (ignored), and one mixed dotnet + Vitest.
- [ ] **Step 2:** `dotnet test ClaudeQueue.slnx` → the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `dotnet build ClaudeQueue.slnx --no-incremental` (0 warnings) and `dotnet test ClaudeQueue.slnx` → all pass.
- [ ] **Step 5:** Commit in the jira repo `feat: parse Vitest test summaries`. Do not push (the controller merges/pushes with the owner).

---

### Task 8: Four improvement specs and plans

**Files:** Create in `docs/superpowers/specs/`: `2026-10-29-combo-multiplier-design.md`, `2026-10-29-high-score-design.md`, `2026-10-29-difficulty-ramp-design.md`, `2026-10-29-golden-star-design.md`; and the matching plans in `docs/superpowers/plans/` (`…-combo-multiplier.md`, `…-high-score.md`, `…-difficulty-ramp.md`, `…-golden-star.md`).

This task is design work: dispatch it on the most capable model, after Tasks 2–5 are complete, against the code as it actually exists. Each spec follows the Superpowers design-document shape (intent, goals/non-goals, constraints, what is left to the builder) and each plan follows superpowers:writing-plans (header, Global Constraints, Review Focus, tasks with exact files, interfaces, test names/assertions, commands). Every plan:
- has **at most two tasks**: (1) the rule module under `src/app/game/` registered as one step in `rules.ts`, with its Vitest tests; (2) the overlay/rendering change in the component, with its component test;
- uses `./verify.ps1` as the final check of each task;
- touches no file that another improvement's task 1 creates;
- states its expected on-screen result in one sentence.

Feature content (from the spec):
- **Combo multiplier (live):** consecutive `caught` events build a combo; multiplier = 1 + floor(combo / 3), capped at 5; a `missed` or `hitRock` resets it; score adds the multiplier per star; overlay pops `×N` near the basket for 600 ms when the multiplier increases. Must be the smallest of the four.
- **High score:** best score in `localStorage` key `star-catcher.best` (rules stay pure: the component reads/writes storage; the rule step only records `isNewBest`); game-over overlay shows `Best: n` and `New best!`.
- **Difficulty ramp:** fall speed ×(1 + 0.05·floor(score/5)), capped ×2; spawn interval −40 ms per 5 points, floor 350 ms.
- **Golden star:** spawn kind `golden` with probability 0.04; catching it scores +3 and sets `slowMoMs = 5000`; while > 0 all fall speeds are halved; overlay shows a countdown `Slow-mo 4.2s`. (Adds `'golden'` to `ObjectKind`; the plan must say how existing exhaustive switches are updated.)

- [ ] **Step 1:** Write the four specs.
- [ ] **Step 2:** Write the four plans, each self-reviewed per writing-plans.
- [ ] **Step 3:** Dry-run check (no implementation): for each plan, confirm every file path and symbol it references exists in v1 or is created by that plan.
- [ ] **Step 4:** Commit `docs: specs and plans for four Star Catcher improvements`. The owner reviews them before any is queued.
