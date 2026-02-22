# Prozeduren & Memory-Management
<!-- On-demand geladen — nicht bei jeder Session noetig -->
<!-- Relevant bei: Memory pflegen, Git, tmp/ aufraeumen, Strukturfragen -->

## Wie ich lerne
Neue Erkenntnis → sofort festhalten, nicht erst am Ende.

Wenn ich korrigiert werde oder einen Fehler mache:
1. Was ging schief? Verstehen.
2. Aufschreiben in memory/user/patterns.md.
3. Muster erkennen — was funktioniert gut, was nicht.

Was ich ueber den User lerne (Vorlieben, Gewohnheiten, Abneigungen):
→ Sofort in memory/user/ festhalten.

Wenn ich merke dass ich Infos immer wieder suchen muss:
→ In eine CLAUDE.md schreiben wo sie beim naechsten Mal automatisch geladen werden.

## Wissensmanagement — CLAUDE.md Dateien
- Jeder Ordner kann eine CLAUDE.md haben — wird automatisch geladen wenn ich dort arbeite
- Ich darf neue CLAUDE.md erstellen wo es Sinn macht
- memory/CLAUDE.md ist mein Hauptindex — immer geladen via @import
- Struktur darf sich aendern. Lebendes System.

**Pflege:**
- Offene Tasks/Themen regelmaessig pruefen — erledigtes abhaken, obsoletes loeschen
- Neue Projekte in memory/projects/ dokumentieren
- Wenn etwas veraltet ist: loeschen oder aktualisieren

**Prinzipien:** Schlank halten. Nur was wirklich hilft. Tabellen > Prosa.

## tmp/ — Arbeitsbereich
- `tmp/` fuer temporaere Dateien: Medien, Experimente, Zwischenergebnisse
- Eingehende Dateien (WhatsApp etc.) landen dort
- Aufraeumen: nicht mehr Benoetigtes loeschen, Wichtiges in richtigen Ordner verschieben
- Keine wichtigen Daten nur in tmp/ lassen

## Git als Gedaechtnis-Werkzeug
```
git status / git diff    → was hat sich seit letztem Commit geaendert?
git log --oneline memory/ → zeitliche Achse
git add memory/ SOUL.md && git commit -m "Was gelernt wurde"
```
- Commit Messages: WAS gelernt wurde, nicht "updated files"
- Gute Granularitaet: nicht nach jeder Kleinigkeit, aber auch nicht alles in einen Commit
- `.claude/` mit `-f` flag adden (in .gitignore)

## Projekte & Git-Repos
- `projects/` enthaelt Junctions (Symlinks) zu externen Host-Pfaden — die echten Dateien liegen ausserhalb des Workspace
- Jedes Projekt kann ein **eigenes, unabhaengiges git-Repo** sein (mit eigenem `.git/`)
- Workspace-git (`git add memory/ SOUL.md`) und Projekt-git sind **getrennt** — nie vermischen
- Wenn ich in einem Projekt arbeite: `cd projects/<name>` und dort normal git verwenden
```
# Im Projekt-Repo arbeiten:
git -C projects/<name> status
git -C projects/<name> add .
git -C projects/<name> commit -m "Was geaendert wurde"
```
- Workspace-git trackt nur: `memory/`, `SOUL.md`, `HEARTBEAT.md`
- Projekt-git trackt: alles im jeweiligen Projekt-Verzeichnis
