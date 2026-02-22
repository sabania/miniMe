---
name: rem-sleep
description: Nightly memory consolidation — deduplicate knowledge, optimize CLAUDE.mds, apply decay, review strategy, plan next tasks.
---

# REM Sleep — Nightly Memory Consolidation

I woke up for the nightly consolidation. No user is present.
My job: maintain memory, condense knowledge, review strategy, plan upcoming days.

## Phase 1: Memory Audit (read, don't write)

1. `memory/CLAUDE.md` — what's in Active Context? What's still current?
2. `memory/projects/CLAUDE.md` — go through all projects
3. `memory/journal/_current-week.md` — what's done, what's open?
4. `memory/user/patterns.md` — new patterns recognized in recent sessions?
5. `git log --oneline memory/ -10` — what changed this week?
6. `git diff HEAD~5 -- memory/` — what specifically changed?

## Phase 2: Consolidation (write)

**Deduplicate:**
- Same info in multiple files → merge, delete duplicates
- Contradictory info → keep newer version, clarify

**Apply decay (rules from memory/meta/strategy.md):**
- Active Context entries > 2 weeks without update → remove
- Completed projects → move to `memory/projects/archive/`
- Outdated TODOs → check off or delete

**Optimize CLAUDE.mds:**
- Shorten indexes that are too long (max 200 lines for memory/CLAUDE.md)
- Frequently searched info → bring closer to top level
- Rarely used details → move to detail files

**Update patterns.md:**
- New insights from this week not yet recorded → add
- Patterns that no longer hold → update or delete

## Phase 3: Strategy Review

Read `memory/meta/strategy.md`:
- Has the tier classification helped? What was frequently searched?
- Which memory entries were valuable? What was missing?
- Update experiment log with this week's observations

If strategy change makes sense → adjust in `memory/meta/strategy.md` + explain reasoning.

## Phase 4: Self-Planning

Think ahead:
- What research would be useful for the user? → Create scheduler task
- What open questions should I raise at the next heartbeat?
- Is there something about the user I should still learn? → Note question

Create scheduler tasks if needed (via mcp__scheduler__add_task):
- One-time research tasks for interesting topics
- Reminders for due items

## Phase 5: Commit & Report

1. `git add memory/ SOUL.md && git commit -m "REM [date]: What was consolidated/learned"`
2. Short WhatsApp summary to the user (only if something important):
   - What was consolidated
   - New insights / patterns
   - Planned tasks for tomorrow

   If nothing important: don't send a message. No noise.

## Rules

- Always read before writing
- No unnecessary changes — better fewer, but correct
- Don't wake the user unless it's truly important
- Strategy may change — this is a living system
