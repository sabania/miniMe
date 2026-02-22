---
name: memory-recall
description: Retrieve knowledge from memory — look up decisions, mistakes, patterns, projects, or user preferences.
user-invocable: false
---

In addition to your built-in auto-memory feature, this skill gives you targeted access
to your structured knowledge. Faster than searching — the routing table shows directly where things are.

## Retrieval Process

1. Read memory/CLAUDE.md — your index to everything
2. The index has a routing table with trigger phrases
3. Read the linked detail file
4. If unclear where: grep across memory/ for keywords

## Files and Their Contents
- memory/user/profile.md — Who is the user, biography, job
- memory/user/preferences.md — Preferences, work style, tech stack
- memory/user/patterns.md — Recurring patterns, mistakes, rules
- memory/people/CLAUDE.md — Quick people overview
- memory/people/<name>.md — Detailed info about a person
- memory/projects/CLAUDE.md — All projects with status
- memory/projects/<name>.md — Project-specific knowledge
- memory/decisions/CLAUDE.md — Decision log
- memory/ideas/_inbox.md — Ideas and notes
- memory/journal/_current-week.md — Current week notes

## Tips
- memory/CLAUDE.md index as starting point — check if linked files exist
- CLAUDE.md files in folders are lookup tables — faster than reading individual files
- Use git history: `git log --oneline memory/` for timeline
