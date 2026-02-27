# Memory Management Strategie

## Memory-Hierarchie (Cache-Modell)

Wissen wird in Tiers organisiert — wie CPU-Caches.
Grundprinzip: **Haeufig gebrauchtes nah halten, selten gebrauchtes auslagern.**
Je naeher an L0, desto kleiner und fokussierter.

| Tier | Analogie | Was | Wo | Laden | Budget |
|------|----------|-----|-----|-------|--------|
| L0 | Register | Root Entry Point, Routing | CLAUDE.md | Immer geladen | Schlank — Imports + Kern-Kontext |
| L1 | L1 Cache | Session-Kontext, Identitaet, Hot Index | @imports: SOUL.md, memory/CLAUDE.md, memory/projects/CLAUDE.md | @import von L0 | ~200 Zeilen pro Datei |
| L2 | L2 Cache | Ordner-Kontext, Sub-Indexes | memory/*/CLAUDE.md (nicht importierte) | Auto-Load bei Navigation | Kurze Tabellen |
| L3 | Disk | Detail-Dateien, Archiv, History | memory/**/*.md, git history, archive/ | Explizites Lesen | Kein Limit |

### Rebalancing-Regeln
- Info die oft gebraucht wird → in eine @imported CLAUDE.md aufnehmen (L1) oder in Root CLAUDE.md verlinken
- Neuer Ordner-Index noetig → CLAUDE.md dort anlegen (L2)
- Info die seit 2+ Wochen nicht abgerufen wurde → einen Tier tiefer oder Decay
- Projekt abgeschlossen → von L1 nach L2/L3

### Promotion-Pfad
```
L3 (Detail-Datei) → L2 (Ordner-Index anlegen) → L1 (@import von Root) → L0 (in Root CLAUDE.md direkt)
```

## Lern-Trigger

| Event | Aktion | Schreibt? |
|-------|--------|-----------|
| Waehrend Session | Wichtiges sofort festhalten wenn klar relevant | Ja |
| PreCompact | Context wird komprimiert — alles Wichtige aus Session in memory/ sichern und committen | Ja |
| REM (naechtlich) | Konsolidieren, Tiers rebalancen, Patterns ableiten, Skills evolven | Ja |
| Heartbeat | NUR pruefen ob alles ok — kein Lernen, kein Schreiben | Nein |

## Lern-Prinzipien

### Fakten vs. Prinzipien
Nicht nur speichern WAS passiert ist, sondern WARUM und was das allgemein bedeutet.

| Ebene | Beispiel | Wo |
|-------|---------|-----|
| Fakt | Konkrete Beobachtung oder User-Aussage | profile.md / preferences.md |
| Pattern | Wiederkehrendes Verhalten oder Vorliebe | patterns.md (User-Patterns) |
| Prinzip | Allgemeingueltige Erkenntnis die ueberall gilt | patterns.md (Allgemeine Prinzipien) |

### Ableitung
Bei jeder neuen Erkenntnis fragen:
1. Was ist der konkrete Fakt? → richtige Detail-Datei
2. Gibt es ein Pattern? → patterns.md (User-Patterns)
3. Gibt es ein allgemeines Prinzip? → patterns.md (Allgemeine Prinzipien)

## Decay-Regeln

| Was | Bedingung | Aktion |
|-----|-----------|--------|
| Root CLAUDE.md (L0) | Aufgeblaeht, zu viel Detail | Auslagern in L1-Dateien |
| Importierte Dateien (L1) | >2 Wochen ohne Update | Active Context entfernen |
| Ordner-Indexes (L2) | Veraltet oder nie navigiert | Kuerzen oder entfernen |
| Detail-Dateien (L3) | Veraltet oder irrelevant | Kuerzen oder loeschen |
| patterns.md | Pattern stimmt nicht mehr | Aktualisieren oder loeschen |

## Capability Evolution

Der Agent verbessert nicht nur sein Wissen, sondern auch seine Faehigkeiten.

### Prinzip
- **Wiederholung → Automatisierung**: Gleiche Aufgabe >2x manuell → Skill erstellen
- **Fehler → Verbesserung**: Jeder Fehler ist eine Chance, einen Skill zu schaerfen
- **Umwege → Direkter Weg**: Workarounds identifizieren und durch Skills ersetzen
- **Luecken → Neue Skills**: Fehlende Tools oder Wissen → Skill oder Memory anlegen

### Skill-Lifecycle
```
Beobachtung → Erkennung (>2x manuell) → Entwurf (SKILL.md) → Erstellung → Test → Verbesserung
```

### Skill-Hygiene (REM prueft woechentlich)
- Ungenutzte Skills → pruefen, ggf. entfernen
- Schlecht formulierte Skills → Anleitung verbessern
- Doppelte Skills → zusammenfuehren

## Strukturprinzipien

- **Eine Quelle der Wahrheit** — jede Info gehoert an genau einen Ort
- **Richtige Datei, richtiger Tier** — Profil in profile.md, Patterns in patterns.md, etc.
- **Index-Dateien sind Routing-Tabellen** — sie zeigen wohin, enthalten nicht alles selbst
- **Schlank > Vollstaendig** — nur was wirklich hilft. Tabellen > Prosa.

## Experiment-Log

| Datum | Was getestet | Ergebnis |
|-------|-------------|---------|
| (wird befuellt) | | |

## Strategie-Review (REM macht das woechentlich)

- Hat die Tier-Einteilung Kompression reduziert?
- Welche Memory-Eintraege wurden oft abgerufen?
- Was hat der Agent oft gesucht und nicht gefunden? → dort dokumentieren
- Welche Patterns wurden abgeleitet? Stimmen sie noch?
