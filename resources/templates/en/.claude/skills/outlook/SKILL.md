---
name: outlook
description: Outlook integration — read/send emails, manage calendar and contacts via PowerShell (Windows) or osascript (Mac).
user-invocable: false
---

## Access

No MCP server — you use Bash directly with PowerShell (Windows) or osascript (macOS).

### Detect Platform

```bash
if [[ "$(uname)" == "Darwin" ]]; then echo "mac"; else echo "win"; fi
```

## Windows — Companion Scripts

Ready-to-use PowerShell scripts are in `scripts/`. All output JSON.

| Script | Purpose | Example Call |
|--------|---------|-------------|
| `read-emails.ps1` | Last N emails | `powershell -NoProfile -File scripts/read-emails.ps1 -Count 5` |
| `get-email.ps1` | Single email by ID | `powershell -NoProfile -File scripts/get-email.ps1 -EntryID "..."` |
| `search-emails.ps1` | Search emails | `powershell -NoProfile -File scripts/search-emails.ps1 -Query "invoice"` |
| `send-email.ps1` | Send email | `powershell -NoProfile -File scripts/send-email.ps1 -To "a@b.com" -Subject "Hi" -Body "Text"` |
| `read-calendar.ps1` | Events in date range | `powershell -NoProfile -File scripts/read-calendar.ps1 -Days 14` |
| `create-event.ps1` | Create event | `powershell -NoProfile -File scripts/create-event.ps1 -Subject "Meeting" -Start "2025-03-01 14:00"` |
| `search-contacts.ps1` | Search contacts | `powershell -NoProfile -File scripts/search-contacts.ps1 -Query "Smith"` |

**Important**: Run scripts from the skill directory (`cd` there or use absolute path).

### Optional Parameters

- `send-email.ps1`: `-CC "cc@example.com"`
- `create-event.ps1`: `-Duration 60` (min, default 60), `-Location "..."`, `-Body "..."`
- `read-emails.ps1`: `-Count N` (default 10)
- `read-calendar.ps1`: `-Days N` (default 7)
- `search-emails.ps1`: `-Count N` (default 20)

## macOS

On macOS, the `macos-pim` skill handles Mail, Calendar and Contacts via osascript (Apple Mail, Calendar.app, Contacts.app). This skill is Windows-only.

## Guidelines

- **Reading emails**: First get overview (Subject, From, Date), then `get-email.ps1` for details
- **Sending emails**: ALWAYS confirm recipient and subject with user before sending
- **No bulk operations**: Max 50 emails/events per query
- **HTML body**: Summarize as plain text for the user
- **Outlook contacts != WhatsApp contacts** in memory/people/
- **Error handling**: If Outlook is not running or not installed, inform the user
- **Output**: All scripts output JSON — directly parsable
