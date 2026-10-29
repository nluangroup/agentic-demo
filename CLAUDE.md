# Star Catcher

Angular 22 game. Standalone components and signals, no NgModules, no SSR, no back end.

## Plan runs

These rules override the global workflow whenever a Superpowers plan is executed, headless or interactive.

1. The Superpowers execution workflow replaces the global Default Workflow and Review Escalation, including the 2-iteration halt.
2. Implementer subagents may commit on the current plan branch. Never push. Never commit to `main` in a plan run.
3. Frontend implementers write their own Vitest tests; there is no separate test agent.
4. `./verify.ps1` exiting 0 is the definition of done; run it before every commit. A `SKIPPED` line is reported, not ignored.
5. Game rules stay pure and tested under `src/app/game/`. A feature adds its own module and registers exactly one step in `rules.ts`. Display goes in the component overlay.
6. Deferred review findings go into the final summary of the run (the queue posts it on the Jira card), not into `TODO.md`.
7. Do not run `ng serve` or any long-lived server in a plan run, except inside `verify.ps1`.
8. Plan and spec documents under `docs/superpowers/` are the approved scope; do not edit them during a plan run.
