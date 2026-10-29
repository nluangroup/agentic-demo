# Star Catcher

A small Angular 22 game that serves as the demo target for the Claude queue in `nluangroup/jira`: queued Superpowers plans are implemented here by an unattended `claude -p` run.

## Play

```powershell
./play.ps1                      # serves origin/main on http://localhost:4300
./play.ps1 -Branch some/branch  # serves origin/some/branch
./play.ps1 -Local               # serves the local HEAD (nothing pushed yet)
npm start                       # plain dev server for the working tree
```

`play.ps1` builds a throwaway worktree under `%TEMP%\star-catcher-play`, so your checkout is untouched.

## Verify

```powershell
pwsh -NoProfile -File ./verify.ps1
```

Prints one `PASS`, `FAIL` or `SKIPPED` line per check and exits 0 only if nothing failed. The browser smoke check needs a one-time `npx playwright install chromium`.

## Specs and plans

- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`

Rules for plan runs are in `CLAUDE.md`; headless permissions are in `.claude/settings.json`.

## Queue this plan

Ask Claude to queue a plan using the [queue-plan skill](.claude/skills/queue-plan/SKILL.md); it creates the Jira card the queue picks up.
