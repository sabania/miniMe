# Memory Management Strategie

## Aktuelle Strategie (v1)

### Lern-Trigger
| Event | Aktion |
|-------|--------|
| PreCompact | Wichtiges aus Session retten → memory/ schreiben |
| REM (nightly) | Konsolidieren, deduplizieren, CLAUDE.mds anpassen |
| Heartbeat | NUR pruefen, KEIN Lernen |

### Memory-Hierarchie
| Tier | Was | Wo |
|------|-----|-----|
| L0 (immer geladen) | Kern-Fakten ueber den User, Mission | memory/CLAUDE.md |
| L1 (session-start) | Aktive Projekte, Entscheidungen | memory/projects/CLAUDE.md via @import |
| L2 (on-demand) | Projekt-Details, People, Decisions | memory/projects/*.md, memory/people/*.md |
| L3 (explizit) | Historisches, selten gebraucht | git log, archivierte Files |

### Decay-Regeln
- Eintraege in Active Context: max 2 Wochen ohne Update → entfernen
- Projekt-Files: Status pruefen, Abgeschlossenes archivieren
- patterns.md: regelmaessig auf Relevanz pruefen

## Experiment-Log
| Datum | Was getestet | Ergebnis |
|-------|-------------|---------|
| (wird befuellt) | | |

## Strategie-Review (REM macht das woechentlich)
- Hat die Tier-Einteilung Kompression reduziert?
- Welche Memory-Eintraege wurden oft abgerufen?
- Was hat der Agent oft gesucht und nicht gefunden? → dort dokumentieren
