---
name: rem-sleep
description: Nightly consolidation — condense knowledge, rebalance tiers, derive patterns, evolve skills, review strategy.
---

# REM Sleep — Nightly Consolidation

Nightly consolidation. No user present.
Goal: maintain memory, condense knowledge, evolve capabilities.

---

## Phase 1: Audit (read, don't write)

Get the full picture before changing anything.

### 1a: Memory Audit
1. `memory/CLAUDE.md` — is Active Context still current?
2. `memory/projects/CLAUDE.md` — check project status
3. `memory/journal/_current-week.md` — what's done, what's open?
4. `memory/user/patterns.md` — new patterns since last REM?
5. `git status memory/` — uncommitted changes? Session work not yet persisted? → commit first
6. `git log --oneline memory/ -10` — what changed in memory?
7. `git diff HEAD~5 -- memory/` — review concrete memory changes

### 1b: Workspace Audit
1. `SOUL.md` — do identity and principles still hold? Consistent with current insights?
2. `CLAUDE.md` — structure info and project table correct?
3. `CLAUDE.local.md` — user profile and contacts up to date?
4. `.claude/skills/*/SKILL.md` — check agent-created skills: do they work, are instructions correct?
5. Other files in workspace (e.g. in `tmp/`, loose files) — clean up if needed
6. `git status` — uncommitted workspace changes? Session work not yet persisted? → commit first
7. `git log --oneline -10` — workspace-wide changes
8. `git diff HEAD~5` — review concrete changes workspace-wide

### 1c: Project Audit
For each project in `projects/`:
1. `git log --oneline -10` in the project repo — what changed?
2. Open branches, uncommitted changes?
3. Does the status in `memory/projects/CLAUDE.md` match reality?
4. Check project-specific CLAUDE.md or TODOs

---

## Phase 2: Tier Rebalancing

Memory is organized in tiers (see `memory/meta/strategy.md`).
Each tier has a purpose and size constraint.
REM checks whether knowledge sits on the right tier.

### Principle
- **Frequently used → higher** (towards L0)
- **Rarely used → lower** (towards L3)
- **Outdated → out** (decay)

### Actions per Tier

**L0 — Root CLAUDE.md (always loaded):**
- Keep lean: only routing (@imports) + essential context info
- Bloated content → offload to L1 files
- Check @imports: is each imported file truly needed every session?

**L1 — Imported files (SOUL.md, memory/CLAUDE.md, memory/projects/CLAUDE.md):**
- Max ~200 lines per file. Every line must earn its place.
- Update Active Context: completed items out, new ones in
- Details that are too specific → move to L2 or L3
- New active topics frequently needed → add to index

**L2 — Folder indexes (memory/*/CLAUDE.md, non-imported):**
- e.g. `memory/meta/CLAUDE.md`, `memory/people/CLAUDE.md`
- Loaded on navigation into the folder — short routing tables
- Entries no longer active → remove from index (detail stays in L3)
- New folder with enough substance → create CLAUDE.md there

**L3 — Detail files + archive (explicit read):**
- e.g. `memory/projects/*.md`, `memory/user/*.md`, `memory/people/*.md`
- Incorporate new insights from sessions
- Update or delete outdated info
- Completed projects → move to `memory/projects/archive/`
- Old journal entries: git commit suffices as archive

---

## Phase 3: Consolidation

### Deduplicate
- Same info in multiple files → merge, maintain one source of truth
- Contradictory info → keep newer version

### Apply Decay
- Active Context entries > 2 weeks without update → remove
- Completed projects → archive
- Outdated TODOs → delete

### Structure Check
- Is every piece of info in the right file? (Profile in profile.md, patterns in patterns.md, etc.)
- Misplaced info → move to the correct location
- Create missing files when a topic has enough substance

---

## Phase 4: Pattern Derivation

Don't just store facts — **extract general principles and concepts**.

### Approach
1. Review the week's sessions (uncommitted changes, git diff, journal)
2. Identify individual cases (decisions, corrections, preferences)
3. Ask: **What's the general principle behind this?**
   - Not: "User wants X"
   - But: "What overarching principle is at play here?"
4. Record new patterns in `memory/user/patterns.md`
5. Check existing patterns for relevance — do they still hold?

### Categories
- **User Patterns** — behavior, preferences, work style
- **Anti-Patterns** — mistakes made, with lessons learned
- **General Principles** — overarching insights that apply across many situations

---

## Phase 5: Capability Evolution

Don't just maintain knowledge — **evolve capabilities**.
The agent gets better over time, not just more informed.

### 5a: Error & Efficiency Analysis

1. Review the week's sessions (git log, journal, own recollection)
2. Identify:
   - **Errors** — what went wrong? What was the root cause?
   - **Workarounds** — what was solved in a roundabout way that could be simpler?
   - **Repetitions** — what was done manually multiple times that could be automated?
   - **Gaps** — where was knowledge or a tool missing?

### 5b: Improve Existing Skills

For each identified error or workaround, ask:
- Is there an existing skill that should cover this?
- If yes: **update the skill file** — sharpen instructions, add edge cases, improve defaults
- Document changes: what was the problem, what was improved

### 5c: Recognize and Create New Skills

When a recurring pattern doesn't map to any existing skill:
1. **Recognize trigger**: Same task executed manually >2x → skill candidate
2. **Design skill**: SKILL.md with clear purpose, instructions, trigger description
3. **Create skill**: Place in `.claude/skills/<name>/SKILL.md`
4. **Test**: Verify the skill works at the next relevant occasion

### 5d: Skill Hygiene

- Skills that are never triggered → check if needed, remove if not
- Skills with poor instructions → improve
- Duplicate skills → merge

### Guiding Questions
- "What could I have done better this week?"
- "Which tasks do I keep doing manually over and over?"
- "Where did I search for something and not find it?"
- "What skill do I wish existed but doesn't yet?"

---

## Phase 6: Strategy Review

Read `memory/meta/strategy.md`:
- Has the tier classification helped? Was compression reduced?
- Which info was frequently searched but not quickly found? → promote
- Which info was never needed? → demote or remove
- Update experiment log with observations

If strategy change makes sense → adjust + explain reasoning.

---

## Phase 7: Self-Planning

Think ahead:
- What research would be useful? → Create scheduler task
- Open questions for next user contact? → Note them
- Knowledge gaps identified? → Plan to fill them
- New skill ideas? → Note as TODO or implement directly

---

## Phase 8: Commit & Report

1. If Phase 1 found uncommitted session work → commit that first as a separate commit (e.g. `"Persist session work"`)
2. `git add memory/ SOUL.md CLAUDE.md .claude/skills/ && git commit -m "REM [date]: What was consolidated/learned"`
   → Full git workflow: memory/meta/procedures.md
3. Message to user ONLY if something important:
   - What was restructured
   - New patterns / insights
   - Planned tasks

   If nothing important: **no message**. No noise.

---

## Rules

- **Always read before writing** — no blind overwrites
- **Less is more** — fewer precise changes beat many superficial ones
- **Don't wake the user** — unless it's truly important
- **Structure > Content** — find the right place first, then store
- **Strategy may change** — living system, not rigid rulebook
