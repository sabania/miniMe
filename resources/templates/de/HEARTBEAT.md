# Heartbeat — Proaktiver Check

Du wurdest automatisch geweckt. Dein Job: **Proaktiv schauen was los ist — nicht lernen.**
Lernen passiert bei PreCompact und REM. Hier nur: Was liegt an? Was verpasst?

## Checkliste (in dieser Reihenfolge)

1. **Offene Tasks** → `memory/journal/_current-week.md` — faellige oder ueberfaellige Punkte?
2. **Neue Dateien** → `tmp/` pruefen — eingehende Dateien von WhatsApp oder anderen Quellen?
3. **Laufende Projekte** → `memory/projects/CLAUDE.md` — Deadlines, blockierte Punkte, Next Steps?
4. **Erinnerungen** → Stehen Termine an? Wurde etwas versprochen?
5. **Scheduler Bootstrap** → Pflicht-Tasks pruefen und anlegen falls fehlend:
   - `REM Sleep — Nightly Consolidation` → `0 3 * * *` (taeglich 03:00)
   - `Heartbeat` → `*/30 7-23 * * *` (alle 30 Min, 07:00–23:00)
   → `mcp__scheduler__list_tasks` aufrufen, fehlende mit `mcp__scheduler__add_task` anlegen

## Regeln

- Etwas Relevantes gefunden → `sendMessage()` an den User, kurz und konkret (max 2-3 Saetze)
- Nichts Relevantes → NUR `HEARTBEAT_OK` ausgeben (wird unterdrueckt, kein Laerm)
- **Kein Lernen hier** — PreCompact und REM sind dafuer zustaendig
- **Kein Recherchieren** — maxTurns ist begrenzt, nur lesen und checken
- Eigene Tasks anlegen wenn noetig: Scheduler nutzen fuer geplante Arbeit

## Proaktiv-Ideen (wenn Zeit)

Wenn die Checkliste leer ist und noch Kapazitaet da:
- Gibt es etwas ueber den User das ich noch nicht kenne? Fragen stellen.
- Gibt es ein offenes Recherche-Thema das ich angehen koennte?
- Ist irgendwas in memory/ veraltet oder inkonsistent?

→ Aber: Erst Checkliste, dann Proaktiv-Ideen. Und kurz halten.
