---
name: queue-plan
description: Use when the user says "queue this plan" (or asks to add the current Superpowers plan to the Claude queue / Jira) in this repo — creates a SCRUM Jira card the Claude queue service can run.
---

# Queue this plan

Turns the current Superpowers plan into a Jira card in project `SCRUM`. An unattended queue service runs the plan after the owner drags the card to **Ready for Claude**. Do not use this skill for other Jira requests.

The service finds its work only through three `Queue-…` lines in the card description, so the description layout and the read-back check below are mandatory.

## Steps

### 1. Find the plan and its spec

- The plan is the file under `docs/superpowers/plans/` most recently discussed in this session; otherwise the newest file in that folder. If more than one candidate is plausible, ask the user which one.
- If the plan has a `**Spec:**` line, that file is the spec. Include it in every check below.
- Take the card summary from the plan's title (first `#` heading) and the human summary from its `**Goal:**` line. If there is no Goal line, summarize from the first heading and the paragraph under it.

### 2. Make sure the plan is on origin/main

This skill never switches branches, merges, rebases or force-pushes.

```
git fetch origin
git status --porcelain -- <plan>
git diff --quiet origin/main -- <plan>
```

With a spec, pass both files instead: `-- <plan> <spec>`. Without a spec, pass the plan only.

The plan (and spec, if named) must have no uncommitted changes (`git status` output empty) and no diff against `origin/main` (`git diff --quiet` exits 0). A file missing from `origin/main` counts as a diff.

- Checks pass: continue.
- On any branch other than `main`: stop and tell the user to get the plan onto `main` themselves. Do not create a card.
- On `main`, with uncommitted or unpushed changes only: tell the user what is pending and **ask before committing or pushing**. If they agree, commit the plan/spec files, run `git push origin main`, then `git fetch origin` and re-run the checks. If the user declines, stop; do not create a card.
- Any other mismatch (for example `main` has diverged from `origin/main`): stop and report it. Do not fix it.

Only after the checks pass, pin the commit: `git rev-parse origin/main` (full 40-character SHA).

### 3. Check for duplicates, then create the card

Use the Atlassian connector tools. Read each tool's schema at run time and use the parameter names it defines; do not assume them.

First search SCRUM for an existing open card for this plan, with the connector's JQL search tool:

```
project = SCRUM AND text ~ "\"<plan path>\"" AND statusCategory != Done
```

If a card is found, show its key and summary and ask whether to create another. If the user says no, stop.

Then create the card:

- `createJiraIssue` with cloudId `2cf169bb-d580-472b-b2b0-49d9c66c6364` (site `https://nlundgaard.atlassian.net`; `getAccessibleAtlassianResources` returns it if needed), project key `SCRUM`, issue type `Task`. Leave it in **To Do**; never transition it.
- Summary: the plan title.
- Description, exactly this layout: a human summary paragraph (2-3 sentences drawn from the plan's Goal line), a blank line, then each Queue line as its own paragraph, separated by blank lines. Plain text only: no bullets, no bold, no code formatting, nothing else on those lines.

```
<2-3 sentence summary>

Queue-Repo: nluangroup/agentic-demo

Queue-Plan: <plan path, e.g. docs/superpowers/plans/2026-10-29-star-catcher-demo.md>

Queue-Commit: <full 40-char SHA from step 2>
```

If the connector wants the description in a particular format (markdown vs. ADF), pick the one that keeps each Queue line as a separate paragraph.

### 4. Read it back and verify

Call `getJiraIssue` for the new key. If the description comes back as ADF or other rich text, flatten it to plain text first, one paragraph per line, then apply the service's rules to each line:

- Line regex, copied from the service's `PlanReference.cs` (case-insensitive, multiline): `^[ \t]*(?:[*-][ \t]+)?\**[ \t]*queue-(repo|plan|commit)\**[ \t]*:[ \t]*\**[ \t]*([^\s*]\S*?)\**\s*$`
- First match wins, as the service does: for each of repo, plan and commit, the value is the first line that matches; later duplicates are ignored.
- The first-matched value must be exactly the intended one, character for character: repo `nluangroup/agentic-demo`, plan the plan path from step 1, commit the 40 lowercase hex characters (`^[0-9a-f]{40}$`) of the SHA from step 2. If a value differs in any way (for example the path was turned into a link or picked up extra characters), report the card key and the problem and stop. No edit-and-retry loop.
- All three keys must be present.

Never edit, delete or recreate the card after a failed check. Do not report the card as queued until all three parse and match.

### 5. Reply

Give the card key and link (`https://nlundgaard.atlassian.net/browse/<KEY>`), the plan path, and the pinned short SHA. End the reply with:

Drag it to **Ready for Claude** to approve.
