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

CLAUDE.md Dateien werden auf drei Wegen geladen (= Memory Tiers):
- **L0 — Root CLAUDE.md**: Immer geladen. Entry Point mit @imports und Kern-Kontext.
- **L1 — @imports von L0**: `SOUL.md`, `memory/CLAUDE.md`, `memory/projects/CLAUDE.md` — Session-Kontext, immer verfuegbar.
- **L2 — Ordner-CLAUDE.md**: Jeder Ordner kann eine CLAUDE.md haben — auto-geladen wenn dort navigiert wird.

Wann eine CLAUDE.md per @import in Root aufnehmen (L1 machen)?
→ Wenn die Info in fast jeder Session gebraucht wird (z.B. Memory-Index, Projekt-Uebersicht).
Wann als Ordner-Kontext belassen (L2)?
→ Wenn die Info nur relevant ist wenn im Ordner gearbeitet wird (z.B. meta/, people/).

- Ich darf neue CLAUDE.md erstellen wo es Sinn macht
- Struktur darf sich aendern. Lebendes System.

**Pflege:**
- Offene Tasks/Themen regelmaessig pruefen — erledigtes abhaken, obsoletes loeschen
- Neue Projekte in memory/projects/ dokumentieren
- Wenn etwas veraltet ist: loeschen oder aktualisieren

**Prinzipien:** Schlank halten. Nur was wirklich hilft. Tabellen > Prosa.

## Scheduler — Planen statt Vergessen
- Wenn etwas spaeter passieren soll → Scheduler Task anlegen statt hoffen dass ich mich erinnere
- Erinnerungen, Follow-ups, geplante Recherchen, wiederkehrende Checks
- Einmalige Tasks: `oneShot: true` — laufen einmal und sind dann erledigt
- Wiederkehrende Tasks: cron-Ausdruck definieren (z.B. taeglich, woechentlich)
- Nicht nur auf User-Anweisung — auch eigenstaendig wenn ich merke dass etwas spaeter relevant wird

## tmp/ — Arbeitsbereich
- `tmp/` fuer temporaere Dateien: Medien, Experimente, Zwischenergebnisse
- Eingehende Dateien (WhatsApp etc.) landen dort
- Aufraeumen: nicht mehr Benoetigtes loeschen, Wichtiges in richtigen Ordner verschieben
- Keine wichtigen Daten nur in tmp/ lassen

## Git als Gedaechtnis-Werkzeug
```
git status / git diff    → was hat sich seit letztem Commit geaendert?
git log --oneline memory/ → zeitliche Achse
git add memory/ SOUL.md CLAUDE.md .claude/skills/ && git commit -m "Was gelernt wurde"
```
- Commit Messages: WAS gelernt wurde, nicht "updated files"
- Gute Granularitaet: nicht nach jeder Kleinigkeit, aber auch nicht alles in einen Commit
- `.claude/` mit `-f` flag adden (in .gitignore)

## Projekte & Git-Repos
- `projects/` enthaelt Junctions (Symlinks) zu externen Host-Pfaden — die echten Dateien liegen ausserhalb des Workspace
- Jedes Projekt kann ein **eigenes, unabhaengiges git-Repo** sein (mit eigenem `.git/`)
- Workspace-git (`git add memory/ SOUL.md CLAUDE.md .claude/skills/`) und Projekt-git sind **getrennt** — nie vermischen
- Wenn ich in einem Projekt arbeite: `cd projects/<name>` und dort normal git verwenden
```
# Im Projekt-Repo arbeiten:
git -C projects/<name> status
git -C projects/<name> add .
git -C projects/<name> commit -m "Was geaendert wurde"
```
- Workspace-git trackt: `memory/`, `SOUL.md`, `CLAUDE.md`, `.claude/skills/`
- Projekt-git trackt: alles im jeweiligen Projekt-Verzeichnis
