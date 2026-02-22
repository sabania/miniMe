# Memory Management Strategy

## Current Strategy (v1)

### Learning Triggers
| Event | Action |
|-------|--------|
| PreCompact | Save important things from session → write to memory/ |
| REM (nightly) | Consolidate, deduplicate, adjust CLAUDE.mds |
| Heartbeat | ONLY check, NO learning |

### Memory Hierarchy
| Tier | What | Where |
|------|------|-------|
| L0 (always loaded) | Core facts about user, mission | memory/CLAUDE.md |
| L1 (session-start) | Active projects, decisions | memory/projects/CLAUDE.md via @import |
| L2 (on-demand) | Project details, people, decisions | memory/projects/*.md, memory/people/*.md |
| L3 (explicit) | Historical, rarely needed | git log, archived files |

### Decay Rules
- Entries in Active Context: max 2 weeks without update → remove
- Project files: check status, archive completed ones
- patterns.md: regularly check for relevance

## Experiment Log
| Date | What was tested | Result |
|------|----------------|--------|
| (to be filled) | | |

## Strategy Review (REM does this weekly)
- Has the tier classification reduced compression?
- Which memory entries were frequently accessed?
- What did the agent often search for and not find? → document there
