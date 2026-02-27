---
name: memory-save
description: Wissen in persistenten Speicher schreiben — neue Erkenntnisse, Entscheidungen oder Fakten festhalten.
---

Nebst deiner eingebauten Auto-Memory Funktion gibt dir dieser Skill eine strukturierte
Ablage fuer Wissen. Hilft dir, dich bei wichtigen Themen schneller zu orientieren.

## Was kommt wohin?

Lies zuerst memory/CLAUDE.md um zu sehen was schon existiert.

Erstelle oder ergaenze Dateien in memory/ nach Thema:
- User-Fakt (Name, Vorliebe, Muster) → memory/user/profile.md oder preferences.md
- Person/Kontakt → memory/people/<vorname-nachname>.md + CLAUDE.md updaten
- Projekt-Wissen → memory/projects/<name>.md
- Entscheidung → memory/decisions/CLAUDE.md (Einzeiler) + ggf. Detail-Datei
- Fehler + Loesung → memory/user/patterns.md
- Idee/Notiz → memory/ideas/_inbox.md
- Session-Eintrag → memory/journal/_current-week.md
- Offener Punkt → memory/ideas/_inbox.md oder Projekt-Datei
- Wichtige Datei aus tmp/ → in den passenden Ordner verschieben

## Regeln
1. Vor dem Schreiben: Datei lesen, pruefen ob Eintrag schon existiert
2. Nach dem Schreiben: IMMER memory/CLAUDE.md Index aktualisieren
3. Kurz und praegnant — keine Romane. Tabellen > Prosa.
4. Neue Dateien erstellen wenn keines der obigen passt
5. CLAUDE.md Dateien in Ordnern pflegen (people/, projects/, decisions/)
6. Erledigtes abhaken oder loeschen, Veraltetes entfernen
7. Neue Projekte (auch lokale im Workspace) in memory/projects/ dokumentieren
8. Git commit nach Aenderungen:
   ```
   git add memory/ SOUL.md CLAUDE.md .claude/skills/
   git commit -m "Beschreibung was gelernt wurde"
   ```
   → Voller Git-Workflow: memory/meta/procedures.md
