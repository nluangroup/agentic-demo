# Star Catcher

A small Angular 22 game, built with Claude and Superpowers.

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

Rules for executing plans are in `CLAUDE.md`.
