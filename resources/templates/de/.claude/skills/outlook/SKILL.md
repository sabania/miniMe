---
name: outlook
description: Outlook-Integration — Emails lesen/senden, Kalender, Kontakte verwalten via PowerShell (Windows) oder osascript (Mac).
user-invocable: false
---

## Zugriff

Kein MCP-Server — du nutzt Bash direkt mit PowerShell (Windows) oder osascript (macOS).

### Plattform erkennen

```bash
if [[ "$(uname)" == "Darwin" ]]; then echo "mac"; else echo "win"; fi
```

## Windows — Companion Scripts

Fertige PowerShell-Scripts liegen in `scripts/`. Alle geben JSON aus.

| Script | Zweck | Aufruf-Beispiel |
|--------|-------|-----------------|
| `read-emails.ps1` | Letzte N Emails | `powershell -NoProfile -File scripts/read-emails.ps1 -Count 5` |
| `get-email.ps1` | Einzelne Email per ID | `powershell -NoProfile -File scripts/get-email.ps1 -EntryID "..."` |
| `search-emails.ps1` | Emails suchen | `powershell -NoProfile -File scripts/search-emails.ps1 -Query "Rechnung"` |
| `send-email.ps1` | Email senden | `powershell -NoProfile -File scripts/send-email.ps1 -To "a@b.com" -Subject "Hi" -Body "Text"` |
| `read-calendar.ps1` | Termine in Zeitraum | `powershell -NoProfile -File scripts/read-calendar.ps1 -Days 14` |
| `create-event.ps1` | Termin erstellen | `powershell -NoProfile -File scripts/create-event.ps1 -Subject "Meeting" -Start "2025-03-01 14:00"` |
| `search-contacts.ps1` | Kontakte suchen | `powershell -NoProfile -File scripts/search-contacts.ps1 -Query "Mueller"` |

**Wichtig**: Scripts aus dem Skill-Verzeichnis ausfuehren (`cd` dorthin oder absoluten Pfad nutzen).

### Optionale Parameter

- `send-email.ps1`: `-CC "cc@example.com"`
- `create-event.ps1`: `-Duration 60` (Min, default 60), `-Location "..."`, `-Body "..."`
- `read-emails.ps1`: `-Count N` (default 10)
- `read-calendar.ps1`: `-Days N` (default 7)
- `search-emails.ps1`: `-Count N` (default 20)

## macOS — Eigene Scripts erstellen

Keine mitgelieferten macOS-Scripts. Erstelle bei Bedarf eigene `scripts/*.sh` mit `osascript` — die bleiben persistent im Skill-Verzeichnis.

Beispiel-Struktur fuer `scripts/read-emails.sh`:
```bash
#!/bin/bash
COUNT=${1:-10}
osascript -e "
tell application \"Microsoft Outlook\"
  set msgs to messages 1 thru $COUNT of inbox
  -- JSON-Ausgabe aufbauen ...
end tell"
```

## Richtlinien

- **Emails lesen**: Erst Uebersicht (Subject, From, Date), dann `get-email.ps1` fuer Details
- **Emails senden**: IMMER Empfaenger und Betreff vom User bestaetigen lassen bevor Send
- **Keine Massen-Operationen**: Max 50 Emails/Termine pro Abfrage
- **HTML-Body**: Fuer den User als plain text zusammenfassen
- **Outlook-Kontakte != WhatsApp-Kontakte** in memory/people/
- **Fehlerbehandlung**: Falls Outlook nicht laeuft oder nicht installiert → User informieren
- **Ausgabe**: Alle Scripts geben JSON aus — direkt parsbar
