# Memory Management Strategy

## Memory Hierarchy (Cache Model)

Knowledge is organized in tiers — like CPU caches.
Core principle: **Keep frequently used knowledge close, offload rarely used knowledge.**
The closer to L0, the smaller and more focused.

| Tier | Analogy | What | Where | Loading | Budget |
|------|---------|------|-------|---------|--------|
| L0 | Register | Root entry point, routing | CLAUDE.md | Always loaded | Lean — imports + core context |
| L1 | L1 Cache | Session context, identity, hot index | @imports: SOUL.md, memory/CLAUDE.md, memory/projects/CLAUDE.md | @import from L0 | ~200 lines per file |
| L2 | L2 Cache | Folder context, sub-indexes | memory/*/CLAUDE.md (non-imported) | Auto-load on navigation | Short tables |
| L3 | Disk | Detail files, archive, history | memory/**/*.md, git history, archive/ | Explicit read | No limit |

### Rebalancing Rules
- Info frequently needed → add to an @imported CLAUDE.md (L1) or link from Root CLAUDE.md
- New folder index needed → create CLAUDE.md there (L2)
- Info not retrieved for 2+ weeks → demote one tier or decay
- Project completed → from L1 to L2/L3

### Promotion Path
```
L3 (detail file) → L2 (create folder index) → L1 (@import from root) → L0 (in Root CLAUDE.md directly)
```

## Learning Triggers

| Event | Action | Writes? |
|-------|--------|---------|
| During session | Save important things immediately when clearly relevant | Yes |
| PreCompact | Context is being compressed — save everything important from session to memory/ and commit | Yes |
| REM (nightly) | Consolidate, rebalance tiers, derive patterns, evolve skills | Yes |
| Heartbeat | ONLY check if everything is ok — no learning, no writing | No |

## Learning Principles

### Facts vs. Principles
Don't just store WHAT happened, but WHY and what it generally means.

| Level | Example | Where |
|-------|---------|-------|
| Fact | Concrete observation or user statement | profile.md / preferences.md |
| Pattern | Recurring behavior or preference | patterns.md (User Patterns) |
| Principle | Universal insight that applies everywhere | patterns.md (General Principles) |

### Derivation
For every new insight, ask:
1. What's the concrete fact? → correct detail file
2. Is there a pattern? → patterns.md (User Patterns)
3. Is there a general principle? → patterns.md (General Principles)

## Decay Rules

| What | Condition | Action |
|------|-----------|--------|
| Root CLAUDE.md (L0) | Bloated, too much detail | Offload to L1 files |
| Imported files (L1) | >2 weeks without update | Remove active context |
| Folder indexes (L2) | Outdated or never navigated | Shorten or remove |
| Detail files (L3) | Outdated or irrelevant | Shorten or delete |
| patterns.md | Pattern no longer holds | Update or delete |

## Capability Evolution

The agent improves not just its knowledge, but also its capabilities.

### Principle
- **Repetition → Automation**: Same task done manually >2x → create a skill
- **Errors → Improvement**: Every mistake is a chance to sharpen a skill
- **Workarounds → Direct path**: Identify roundabout solutions and replace with skills
- **Gaps → New skills**: Missing tools or knowledge → create skill or memory entry

### Skill Lifecycle
```
Observation → Recognition (>2x manual) → Design (SKILL.md) → Creation → Test → Improvement
```

### Skill Hygiene (REM checks weekly)
- Unused skills → check if needed, remove if not
- Poorly documented skills → improve instructions
- Duplicate skills → merge

## Structure Principles

- **One source of truth** — every piece of info belongs in exactly one place
- **Right file, right tier** — profile in profile.md, patterns in patterns.md, etc.
- **Index files are routing tables** — they point to where things are, don't contain everything themselves
- **Lean > Complete** — only what truly helps. Tables > prose.

## Experiment Log

| Date | What was tested | Result |
|------|----------------|--------|
| (to be filled) | | |

## Strategy Review (REM does this weekly)

- Has the tier classification reduced compression?
- Which memory entries were frequently accessed?
- What did the agent often search for and not find? → document there
- Which patterns were derived? Do they still hold?
