---
name: macos-pim
description: macOS PIM-Integration — Mail, Kalender, Kontakte verwalten via osascript (Apple Mail, Calendar.app, Contacts.app).
user-invocable: false
---

## Voraussetzungen

**Erster Zugriff**: macOS zeigt beim ersten Aufruf pro App einen Dialog:
> "Terminal/Claude moechte auf Mail/Kalender/Kontakte zugreifen — Erlauben?"

→ User muss **"Allow"** klicken. Danach kommt die Frage nicht mehr.
→ Einstellbar unter: **System Settings → Privacy & Security → Automation**

## Plattform

Nur macOS. Nutzt `osascript` (AppleScript) fuer:
- **Mail.app** — Emails lesen, senden, suchen
- **Calendar.app** — Termine lesen, erstellen
- **Contacts.app** — Kontakte suchen, auflisten

## Companion Scripts

Alle Scripts liegen in `scripts/`. Aufruf mit `bash` aus dem Skill-Verzeichnis.

### Mail

| Script | Zweck | Aufruf |
|--------|-------|--------|
| `read-emails.sh` | Letzte N Emails aus Inbox | `bash scripts/read-emails.sh [count]` |
| `send-email.sh` | Email senden | `bash scripts/send-email.sh "to" "subject" "body" [from]` |
| `search-emails.sh` | Emails suchen nach Betreff/Absender | `bash scripts/search-emails.sh "suchbegriff" [count]` |

### Calendar

| Script | Zweck | Aufruf |
|--------|-------|--------|
| `read-calendar.sh` | Termine der naechsten N Tage | `bash scripts/read-calendar.sh [days]` |
| `create-event.sh` | Neuen Termin erstellen | `bash scripts/create-event.sh "calendar" "title" "start" "end" [location] [notes]` |

### Contacts

| Script | Zweck | Aufruf |
|--------|-------|--------|
| `search-contacts.sh` | Kontakte suchen | `bash scripts/search-contacts.sh "name"` |
| `list-contacts.sh` | Alle Kontakte auflisten | `bash scripts/list-contacts.sh [count]` |

## Richtlinien

- **Emails senden**: IMMER Empfaenger und Betreff vom User bestaetigen lassen
- **Keine Massen-Operationen**: Max 50 Emails/Termine/Kontakte pro Abfrage
- **HTML-Body**: Fuer den User als plain text zusammenfassen
- **Fehlerbehandlung**: Falls App nicht laeuft → osascript startet sie automatisch
- **Accounts**: Mail.app kann mehrere Accounts haben — bei Senden den richtigen waehlen
- **Kalender**: Beim Erstellen den richtigen Kalender angeben (Arbeit, Privat, etc.)

## Erweiterbar

Der gleiche `osascript`-Ansatz funktioniert fuer weitere macOS-Apps (Notes, Reminders, Messages/iMessage, Finder, etc.). Falls der User es wuenscht, neue `.sh`-Scripts in `scripts/` anlegen — sie bleiben ueber Updates hinweg erhalten.
