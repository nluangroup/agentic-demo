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
- Take the card summary from the plan's title (first `#` heading) and the human summary from its `**Goal:**` line.

### 2. Make sure the plan is pushed

Run, with `<plan>` and `<spec>` as repo-relative paths (omit `<spec>` if there is none):

```
git fetch origin
git status --porcelain -- <plan> <spec>
git log origin/main..HEAD -- <plan> <spec>
```

Both `git status` and `git log` output must be empty (nothing uncommitted, nothing unpushed). Also confirm the current branch is `main`, or that the plan is on `origin/main` (`git cat-file -e origin/main:<plan>`).

If either has output: tell the user what is pending and **ask before committing or pushing**. Only commit/push after they agree, then re-run the checks until both are empty.

Then pin the commit: `git rev-parse origin/main` (the full 40-character SHA of the commit on `origin/main` that contains the plan).

### 3. Create the card

Use the Atlassian connector tools. Read each tool's schema at run time and use the parameter names it defines; do not assume them.

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

Call `getJiraIssue` for the new key and take the description as the service will see it. Apply the service's rules to each line:

- Line regex (case-insensitive, multiline): `^\s*(?:[*-]\s+)?\**queue-(repo|plan|commit)\**\s*:\s*\**(\S+?)\**\s*$`
- Repo must equal `nluangroup/agentic-demo`.
- Plan must be the plan path from step 1.
- Commit must match `^[0-9a-f]{40}$` (case-insensitive) and equal the SHA from step 2.
- Each of repo, plan, commit must match exactly once.

If any check fails, tell the user what was wrong, fix the description (update the issue using the connector's edit tool, or recreate if it cannot be edited), and re-verify. Do not report the card as queued until all three parse.

### 5. Reply

Give the card key and link (`https://nlundgaard.atlassian.net/browse/<KEY>`), the plan path, and the pinned short SHA. End the reply with:

Drag it to **Ready for Claude** to approve.
