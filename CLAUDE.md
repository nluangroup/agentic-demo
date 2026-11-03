# Star Catcher

Angular 22 game. Standalone components and signals, no NgModules, no SSR, no back end.

## Working in this repo

These rules override the global workflow whenever a Superpowers plan is executed.

1. The Superpowers execution workflow replaces the global Default Workflow, Review Escalation and Subagent Policies. Use Superpowers' own implementer and reviewer subagents; no `/bg`, no `claude agents`. This includes dropping the 2-iteration halt.
2. Frontend implementers write their own Vitest tests; there is no separate test agent.
3. `./verify.ps1` exiting 0 is the definition of done; run it before every commit. A `SKIPPED` line is reported, not ignored.
4. Game rules stay pure and tested under `src/app/game/`. A feature adds its own module and registers exactly one step in `rules.ts`. Display goes in the component overlay.
5. Do not run `ng serve` or any long-lived server while executing a plan, except inside `verify.ps1`.
6. Plan and spec documents under `docs/superpowers/` are the approved scope; do not edit them while executing a plan.
7. In a fresh clone, run `npm ci` before any other npm/npx command.
