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
- Every folder can have a CLAUDE.md — auto-loaded when I work there
- I may create new CLAUDE.md files where it makes sense
- memory/CLAUDE.md is my main index — always loaded via @import
- Structure may change. Living system.

**Maintenance:**
- Regularly check open tasks/topics — check off completed, delete obsolete
- Document new projects in memory/projects/
- If something is outdated: delete or update

**Principles:** Keep it lean. Only what truly helps. Tables > prose.

## tmp/ — Workspace
- `tmp/` for temporary files: media, experiments, intermediate results
- Incoming files (WhatsApp etc.) land there
- Cleanup: delete what's no longer needed, move important things to proper folders
- Don't leave important data only in tmp/

## Git as Memory Tool
```
git status / git diff    → what changed since last commit?
git log --oneline memory/ → timeline
git add memory/ SOUL.md && git commit -m "What was learned"
```
- Commit messages: WHAT was learned, not "updated files"
- Good granularity: not after every tiny change, but don't batch everything into one commit
- `.claude/` add with `-f` flag (in .gitignore)
