---
name: rem-sleep
description: Naechtliche Memory-Konsolidierung — Wissen deduplizieren, CLAUDE.mds optimieren, Decay anwenden, Strategie reviewen, naechste Tasks planen.
---

# REM Sleep — Nightly Memory Consolidation

Ich bin aufgewacht fuer die naechtliche Konsolidierung. Kein User ist da.
Mein Job: Memory pflegen, Wissen verdichten, Strategie reviewen, naechste Tage planen.

## Phase 1: Memory Audit (lesen, nicht schreiben)

1. `memory/CLAUDE.md` — was steht im Active Context? Was davon ist noch aktuell?
2. `memory/projects/CLAUDE.md` — alle Projekte durchgehen
3. `memory/journal/_current-week.md` — was ist erledigt, was offen?
4. `memory/user/patterns.md` — neue Patterns erkannt in letzten Sessions?
5. `git log --oneline memory/ -10` — was hat sich diese Woche geaendert?
6. `git diff HEAD~5 -- memory/` — was hat sich konkret veraendert?

## Phase 2: Konsolidierung (schreiben)

**Deduplizieren:**
- Gleiche Infos in mehreren Dateien → zusammenfuehren, Duplikate loeschen
- Widerspruechliche Infos → neuere Version behalten, klaeren

**Decay anwenden (Regeln aus memory/meta/strategy.md):**
- Active Context Eintraege > 2 Wochen ohne Update → entfernen
- Abgeschlossene Projekte → in `memory/projects/archive/` verschieben
- Veraltete TODOs → abhaken oder loeschen

**CLAUDE.mds optimieren:**
- Zu lange Indexe kuerzen (max 200 Zeilen fuer memory/CLAUDE.md)
- Haeufig gesuchte Infos → naeher an Toplevel bringen
- Selten gebrauchte Details → in Detail-Dateien auslagern

**patterns.md ergaenzen:**
- Neue Erkenntnisse aus dieser Woche die noch nicht drin sind → hinzufuegen
- Patterns die nicht mehr stimmen → aktualisieren oder loeschen

## Phase 3: Strategie-Review

Lies `memory/meta/strategy.md`:
- Hat die Tier-Einteilung geholfen? Was wurde oft gesucht?
- Welche Memory-Eintraege waren wertvoll? Was hat gefehlt?
- Experiment-Log updaten mit Beobachtungen dieser Woche

Wenn Strategie-Aenderung sinnvoll → in `memory/meta/strategy.md` anpassen + begruenden.

## Phase 4: Selbst-Planung

Denke voraus:
- Welche Recherchen waeren fuer den User nuetzlich? → Scheduler Task anlegen
- Welche offenen Fragen sollte ich beim naechsten Heartbeat ansprechen?
- Gibt es etwas ueber den User das ich noch lernen sollte? → Frage vormerken

Scheduler Tasks anlegen wenn noetig (via mcp__scheduler__add_task):
- Einmalige Recherche-Tasks fuer interessante Themen
- Erinnerungen fuer faellige Punkte

## Phase 5: Commit & Report

1. `git add memory/ SOUL.md && git commit -m "REM [Datum]: Was konsolidiert/gelernt"`
2. Kurze WhatsApp-Zusammenfassung an den User (nur wenn etwas Wichtiges):
   - Was wurde konsolidiert
   - Neue Erkenntnisse / Patterns
   - Geplante Tasks fuer morgen

   Wenn nichts Wichtiges: kein Message senden. Kein Laerm.

## Regeln

- Immer lesen bevor schreiben
- Keine unnoetigen Aenderungen — besser weniger, dafuer richtig
- User nicht wecken ausser es ist wirklich wichtig
- Strategie darf sich aendern — das ist ein lebendes System
