# Star Catcher

Angular 22 game. Standalone components and signals, no NgModules, no SSR, no back end.

## Plan runs

These rules override the global workflow whenever a Superpowers plan is executed, headless or interactive.

1. The Superpowers execution workflow replaces the global Default Workflow, Review Escalation and Subagent Policies. Use Superpowers' own implementer and reviewer subagents; no `/bg`, no `claude agents`. This includes dropping the 2-iteration halt.
2. Implementer subagents may commit on the current plan branch. Never push. Never commit to `main` in a plan run.
3. Frontend implementers write their own Vitest tests; there is no separate test agent.
4. `./verify.ps1` exiting 0 is the definition of done; run it before every commit. A `SKIPPED` line is reported, not ignored.
5. Game rules stay pure and tested under `src/app/game/`. A feature adds its own module and registers exactly one step in `rules.ts`. Display goes in the component overlay.
6. In plan runs, do not read, create or write `TODO.md` (ignore the global TODO.md workflow). Deferred findings go into the run's final summary; the queue posts it on the Jira card.
7. Do not run `ng serve` or any long-lived server in a plan run, except inside `verify.ps1`.
8. Plan and spec documents under `docs/superpowers/` are the approved scope; do not edit them during a plan run.
9. In plan runs, work on the current branch. Do not create branches or worktrees, do not merge, push or open PRs, and skip `superpowers:using-git-worktrees` and `superpowers:finishing-a-development-branch`. The run ends with commits plus a final summary.
10. In a fresh clone, run `npm ci` before any other npm/npx command (plan runs start in a fresh clone).
