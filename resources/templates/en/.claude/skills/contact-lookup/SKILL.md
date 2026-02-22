---
name: contact-lookup
description: Look up people and contacts — for questions about people, contact details, or mentioned names.
user-invocable: false
---

## Process

1. Read CLAUDE.local.md — the current contact list with numbers and descriptions
2. Read memory/people/CLAUDE.md for the quick overview
3. Search for name, nickname, or role in the table
4. Read memory/people/<firstname-lastname>.md for details
5. If not found: grep across memory/ for the name
6. If completely unknown: tell the user, offer to create an entry

## People Files Contain
- Name, role, relationship to user
- Contact details (phone, email)
- Context (how known, which project)
- Last interactions
- Important details and notes

## Naming Conventions
- Files: firstname-lastname.md (lowercase, hyphens)
- "Also known as" column in CLAUDE.md for nicknames
  Example: "Pete" → peter-mueller.md
