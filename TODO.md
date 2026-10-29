# TODO

## Medium Priority — 2026-10-29
- [ ] **#1 — Prove the headless allowlist in rehearsal** (`.claude/settings.json`)
  Matcher behaviour of the `:*` entries, mid-path wildcards for the Superpowers scripts, `cd … &&` compound commands and `$(cat <<EOF)` commit messages are unvalidated. On Windows, headless Claude uses the PowerShell tool, so every rule needs its PowerShell twin. Fix the list until two consecutive rehearsals log no denials.
- [ ] **#2 — Time the live combo plan headless** (`docs/superpowers/plans/2026-10-29-combo-multiplier.md`)
  Target ~10 min including `npm ci` in a fresh clone; two SDD tasks may run 10–15 min.
- [ ] **#3 — Look at the golden star on screen** (`docs/superpowers/plans/2026-10-29-golden-star.md`)
  Its colour is only checked with a fake canvas; check with `./play.ps1 -Branch <golden branch>`.
- [ ] **#4 — `verify.ps1` doesn't fail on build warnings** (`verify.ps1`)
  The spec asks for warnings-as-errors where the toolchain allows.

## Low Priority — 2026-10-29
- [ ] **#5 — Broad shell permissions in unattended runs** (`.claude/settings.json`)
  `rm`, `Remove-Item`, `find` (`-delete`/`-exec`) and `echo` (redirects) are unrestricted.
- [ ] **#6 — Objects below the basket line can still be caught** (`src/app/game/steps/collide.ts`)
- [ ] **#7 — No tick-level test that collide's events reach later steps** (`src/app/game/tick.spec.ts`)
- [ ] **#8 — Spawn object literal not annotated `FallingObject`** (`src/app/game/steps/spawn.ts`)
- [ ] **#9 — Touch tap without move doesn't set the pointer; DPR not re-read after zoom** (`src/app/game-canvas/game-canvas.ts`)
- [ ] **#10 — smoke.mjs edge cases** (`tools/smoke.mjs`)
  `--screenshots` without a value or with a missing dir throws; a missing asset returns `index.html` with 200; a malformed `%` URL is unhandled.
- [ ] **#11 — Indented verify tail lines could start with `SKIPPED`** (`verify.ps1`)
- [ ] **#12 — Queue skill nits** (`.claude/skills/queue-plan/SKILL.md`)
  No explicit command for "current branch is main"; JQL `text ~` may give false-positive duplicates.
- [ ] **#13 — High-score plan Task 2 RED list is partial** (`docs/superpowers/plans/2026-10-29-high-score.md`)
- [ ] **#14 — play.ps1 throws if a non-worktree folder sits at the play path; leaves `.package-lock.sha` untracked** (`play.ps1`)
- [ ] **#15 — Karma-era `.vscode` launch/tasks entries** (`.vscode/`)
- [ ] **#16 — Explicit `strict`/`strictTemplates` in tsconfig** (`tsconfig.json`)
