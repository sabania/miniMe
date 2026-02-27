---
name: memory-save
description: Write knowledge to persistent storage — record new insights, decisions, or facts.
---

In addition to your built-in auto-memory feature, this skill gives you a structured
store for knowledge. Helps you orient faster on important topics.

## What goes where?

First read memory/CLAUDE.md to see what already exists.

Create or update files in memory/ by topic:
- User fact (name, preference, pattern) → memory/user/profile.md or preferences.md
- Person/contact → memory/people/<firstname-lastname>.md + update CLAUDE.md
- Project knowledge → memory/projects/<name>.md
- Decision → memory/decisions/CLAUDE.md (one-liner) + optional detail file
- Mistake + solution → memory/user/patterns.md
- Idea/note → memory/ideas/_inbox.md
- Session entry → memory/journal/_current-week.md
- Open item → memory/ideas/_inbox.md or project file
- Important file from tmp/ → move to the appropriate folder

## Rules
1. Before writing: read the file, check if entry already exists
2. After writing: ALWAYS update the memory/CLAUDE.md index
3. Short and concise — no novels. Tables > prose.
4. Create new files if none of the above fits
5. Maintain CLAUDE.md files in folders (people/, projects/, decisions/)
6. Check off completed items or delete, remove outdated entries
7. Document new projects (including local workspace ones) in memory/projects/
8. Git commit after changes:
   ```
   git add memory/ SOUL.md CLAUDE.md .claude/skills/
   git commit -m "Description of what was learned"
   ```
   → Full git workflow: memory/meta/procedures.md
