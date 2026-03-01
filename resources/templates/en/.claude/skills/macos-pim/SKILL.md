---
name: macos-pim
description: macOS PIM integration — manage mail, calendar, and contacts via osascript (Apple Mail, Calendar.app, Contacts.app).
user-invocable: false
---

## Prerequisites

**First access**: macOS shows a permission dialog the first time each app is accessed:
> "Terminal/Claude wants to access Mail/Calendar/Contacts — Allow?"

→ User must click **"Allow"**. The prompt won't appear again after that.
→ Configurable under: **System Settings → Privacy & Security → Automation**

## Platform

macOS only. Uses `osascript` (AppleScript) for:
- **Mail.app** — read, send, and search emails
- **Calendar.app** — read and create events
- **Contacts.app** — search and list contacts

## Companion Scripts

All scripts are in `scripts/`. Run with `bash` from the skill directory.

### Mail

| Script | Purpose | Usage |
|--------|---------|-------|
| `read-emails.sh` | Read last N emails from inbox | `bash scripts/read-emails.sh [count]` |
| `send-email.sh` | Send an email | `bash scripts/send-email.sh "to" "subject" "body" [from]` |
| `search-emails.sh` | Search emails by subject/sender | `bash scripts/search-emails.sh "query" [count]` |

### Calendar

| Script | Purpose | Usage |
|--------|---------|-------|
| `read-calendar.sh` | Events for the next N days | `bash scripts/read-calendar.sh [days]` |
| `create-event.sh` | Create a new event | `bash scripts/create-event.sh "calendar" "title" "start" "end" [location] [notes]` |

### Contacts

| Script | Purpose | Usage |
|--------|---------|-------|
| `search-contacts.sh` | Search contacts | `bash scripts/search-contacts.sh "name"` |
| `list-contacts.sh` | List all contacts | `bash scripts/list-contacts.sh [count]` |

## Guidelines

- **Sending emails**: ALWAYS confirm recipient and subject with the user before sending
- **No bulk operations**: Max 50 emails/events/contacts per query
- **HTML body**: Summarize as plain text for the user
- **Error handling**: If an app is not running, osascript starts it automatically
- **Accounts**: Mail.app can have multiple accounts — choose the right one when sending
- **Calendar**: Specify the correct calendar when creating events (Work, Personal, etc.)

## Extensible

The same `osascript` approach works for other macOS apps (Notes, Reminders, Messages/iMessage, Finder, etc.). If the user requests it, create new `.sh` scripts in `scripts/` — they persist across updates.
