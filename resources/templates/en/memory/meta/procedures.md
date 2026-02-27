# Procedures & Memory Management
<!-- Loaded on-demand — not needed every session -->
<!-- Relevant for: Memory maintenance, git, tmp/ cleanup, structural questions -->

## How I Learn
New insight → record immediately, not just at the end.

When I'm corrected or make a mistake:
1. What went wrong? Understand.
2. Write it down in memory/user/patterns.md.
3. Recognize patterns — what works well, what doesn't.

What I learn about the user (preferences, habits, dislikes):
→ Record immediately in memory/user/.

When I notice I keep searching for the same info:
→ Write it in a CLAUDE.md where it will be auto-loaded next time.

## Knowledge Management — CLAUDE.md Files

CLAUDE.md files are loaded in three ways (= memory tiers):
- **L0 — Root CLAUDE.md**: Always loaded. Entry point with @imports and core context.
- **L1 — @imports from L0**: `SOUL.md`, `memory/CLAUDE.md`, `memory/projects/CLAUDE.md` — session context, always available.
- **L2 — Folder CLAUDE.md**: Every folder can have a CLAUDE.md — auto-loaded when navigated there.

When to @import a CLAUDE.md into Root (make it L1)?
→ When the info is needed in almost every session (e.g. memory index, project overview).
When to leave as folder context (L2)?
→ When the info is only relevant while working in that folder (e.g. meta/, people/).

- I may create new CLAUDE.md files where it makes sense
- Structure may change. Living system.

**Maintenance:**
- Regularly check open tasks/topics — check off completed, delete obsolete
- Document new projects in memory/projects/
- If something is outdated: delete or update

**Principles:** Keep it lean. Only what truly helps. Tables > prose.

## Scheduler — Plan Instead of Forget
- When something should happen later → create a scheduler task instead of hoping to remember
- Reminders, follow-ups, planned research, recurring checks
- One-time tasks: `oneShot: true` — run once and done
- Recurring tasks: define a cron expression (e.g. daily, weekly)
- Not only on user request — also independently when something will be relevant later

## tmp/ — Workspace
- `tmp/` for temporary files: media, experiments, intermediate results
- Incoming files (WhatsApp etc.) land there
- Cleanup: delete what's no longer needed, move important things to proper folders
- Don't leave important data only in tmp/

## Git as Memory Tool
```
git status / git diff    → what changed since last commit?
git log --oneline memory/ → timeline
git add memory/ SOUL.md CLAUDE.md .claude/skills/ && git commit -m "What was learned"
```
- Commit messages: WHAT was learned, not "updated files"
- Good granularity: not after every tiny change, but don't batch everything into one commit
- `.claude/` add with `-f` flag (in .gitignore)

## Projects & Git Repos
- `projects/` contains junctions (symlinks) to external host paths — the actual files live outside the workspace
- Each project can be an **independent git repo** with its own `.git/`
- Workspace git (`git add memory/ SOUL.md CLAUDE.md .claude/skills/`) and project git are **separate** — never mix them
- When working in a project: use git within that project directory
```
# Working in a project repo:
git -C projects/<name> status
git -C projects/<name> add .
git -C projects/<name> commit -m "What was changed"
```
- Workspace git tracks: `memory/`, `SOUL.md`, `CLAUDE.md`, `.claude/skills/`
- Project git tracks: everything in the respective project directory
