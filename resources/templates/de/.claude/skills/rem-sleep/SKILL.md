---
name: rem-sleep
description: Naechtliche Konsolidierung — Wissen verdichten, Tiers rebalancen, Patterns ableiten, Skills evolven, Strategie reviewen.
---

# REM Sleep — Nightly Consolidation

Naechtliche Konsolidierung. Kein User anwesend.
Ziel: Gedaechtnis pflegen, Wissen verdichten, Faehigkeiten weiterentwickeln.

---

## Phase 1: Audit (lesen, nicht schreiben)

Gesamtbild erfassen bevor etwas geaendert wird.

### 1a: Memory Audit
1. `memory/CLAUDE.md` — Active Context noch aktuell?
2. `memory/projects/CLAUDE.md` — Projekt-Status pruefen
3. `memory/journal/_current-week.md` — was ist erledigt, was offen?
4. `memory/user/patterns.md` — neue Patterns seit letztem REM?
5. `git status memory/` — uncommitted Aenderungen? Session-Arbeit die noch nicht persistiert wurde? → zuerst committen
6. `git log --oneline memory/ -10` — was hat sich in memory geaendert?
7. `git diff HEAD~5 -- memory/` — konkrete Memory-Aenderungen reviewen

### 1b: Workspace Audit
1. `SOUL.md` — Stimmen Identitaet und Prinzipien noch? Passt das zu aktuellen Erkenntnissen?
2. `CLAUDE.md` — Struktur-Infos und Projekt-Tabelle korrekt?
3. `CLAUDE.local.md` — User-Profil und Kontakte aktuell?
4. `.claude/skills/*/SKILL.md` — Agent-erstellte Skills pruefen: funktionieren sie, sind Anleitungen korrekt?
5. Sonstige Dateien im Workspace (z.B. in `tmp/`, lose Dateien) — aufraeumen wenn noetig
6. `git status` — uncommitted Workspace-Aenderungen? Nicht persistierte Session-Arbeit? → zuerst committen
7. `git log --oneline -10` — workspace-weite Aenderungen
8. `git diff HEAD~5` — konkrete Aenderungen workspace-weit reviewen

### 1c: Projekt Audit
Fuer jedes Projekt in `projects/`:
1. `git log --oneline -10` im Projekt-Repo — was wurde geaendert?
2. Offene Branches, uncommitted Changes?
3. Stimmt der Status in `memory/projects/CLAUDE.md` mit der Realitaet ueberein?
4. Projekt-spezifische CLAUDE.md oder TODOs pruefen

---

## Phase 2: Tier-Rebalancing

Memory ist in Tiers organisiert (siehe `memory/meta/strategy.md`).
Jeder Tier hat einen Zweck und eine Groessenbeschraenkung.
REM prueft ob Wissen auf dem richtigen Tier liegt.

### Prinzip
- **Haeufig gebraucht → hoeher** (Richtung L0)
- **Selten gebraucht → tiefer** (Richtung L3)
- **Veraltet → raus** (Decay)

### Aktionen pro Tier

**L0 — Root CLAUDE.md (immer geladen):**
- Schlank halten: nur Routing (@imports) + essentielle Kontext-Infos
- Aufgeblaehtes → in L1-Dateien auslagern
- @imports pruefen: wird jede importierte Datei wirklich jede Session gebraucht?

**L1 — Importierte Dateien (SOUL.md, memory/CLAUDE.md, memory/projects/CLAUDE.md):**
- Max ~200 Zeilen pro Datei. Jede Zeile muss ihren Platz verdienen.
- Active Context aktualisieren: Abgeschlossenes raus, Neues rein
- Details die zu spezifisch sind → nach L2 oder L3 verschieben
- Neue aktive Themen die oft gebraucht werden → in Index aufnehmen

**L2 — Ordner-Indexes (memory/*/CLAUDE.md, nicht importierte):**
- z.B. `memory/meta/CLAUDE.md`, `memory/people/CLAUDE.md`
- Werden geladen bei Navigation in den Ordner — kurze Routing-Tabellen
- Eintraege die nicht mehr aktiv sind → aus Index entfernen (Detail bleibt in L3)
- Neuer Ordner mit genuegend Substanz → CLAUDE.md dort anlegen

**L3 — Detail-Dateien + Archiv (explizites Lesen):**
- z.B. `memory/projects/*.md`, `memory/user/*.md`, `memory/people/*.md`
- Neue Erkenntnisse aus Sessions einarbeiten
- Veraltete Infos aktualisieren oder loeschen
- Abgeschlossene Projekte → `memory/projects/archive/` verschieben
- Alte Journal-Eintraege: git commit reicht als Archiv

---

## Phase 3: Konsolidierung

### Deduplizieren
- Gleiche Info in mehreren Dateien → zusammenfuehren, eine Quelle der Wahrheit
- Widerspruechliche Infos → neuere Version behalten

### Decay anwenden
- Active Context Eintraege > 2 Wochen ohne Update → entfernen
- Abgeschlossene Projekte → archivieren
- Veraltete TODOs → loeschen

### Strukturpruefung
- Liegt jede Info in der richtigen Datei? (Profil in profile.md, Patterns in patterns.md, etc.)
- Falsch abgelegte Infos → an den richtigen Ort verschieben
- Fehlende Dateien erstellen wenn ein Thema genug Substanz hat

---

## Phase 4: Pattern-Ableitung

Nicht nur Fakten speichern — **allgemeine Prinzipien und Konzepte extrahieren**.

### Vorgehen
1. Sessions der Woche durchgehen (uncommitted Changes, git diff, Journal)
2. Einzelfaelle identifizieren (Entscheidungen, Korrekturen, Vorlieben)
3. Fragen: **Was ist das allgemeine Prinzip dahinter?**
   - Nicht: "User will X"
   - Sondern: "Welches uebergreifende Prinzip steckt dahinter?"
4. Neue Patterns in `memory/user/patterns.md` festhalten
5. Bestehende Patterns auf Relevanz pruefen — stimmen sie noch?

### Kategorien
- **User-Patterns** — Verhalten, Vorlieben, Arbeitsweise
- **Anti-Patterns** — Fehler die gemacht wurden, mit Lektion
- **Allgemeine Prinzipien** — uebergreifende Erkenntnisse die in vielen Situationen gelten

---

## Phase 5: Capability Evolution

Nicht nur Wissen pflegen — **eigene Faehigkeiten weiterentwickeln**.
Der Agent wird mit der Zeit besser, nicht nur informierter.

### 5a: Fehler- und Effizienz-Analyse

1. Sessions der Woche durchgehen (git log, Journal, eigene Erinnerung)
2. Identifizieren:
   - **Fehler** — wo lief etwas schief? Was war die Ursache?
   - **Umwege** — wo wurde etwas umstaendlich geloest, das einfacher ginge?
   - **Wiederholungen** — was wurde mehrfach manuell gemacht, das automatisierbar waere?
   - **Luecken** — wo fehlte Wissen oder ein Tool?

### 5b: Bestehende Skills verbessern

Fuer jeden erkannten Fehler oder Umweg fragen:
- Gibt es einen bestehenden Skill der das abdecken sollte?
- Wenn ja: **Skill-Datei anpassen** — Anleitung schaerfen, Edge-Cases ergaenzen, bessere Defaults
- Aenderungen dokumentieren: was war das Problem, was wurde verbessert

### 5c: Neue Skills erkennen und erstellen

Wenn ein wiederkehrendes Muster keinem bestehenden Skill zugeordnet werden kann:
1. **Trigger erkennen**: Gleiche Aufgabe >2x manuell ausgefuehrt → Skill-Kandidat
2. **Skill entwerfen**: SKILL.md mit klarem Zweck, Anleitung, Trigger-Beschreibung
3. **Skill erstellen**: In `.claude/skills/<name>/SKILL.md` ablegen
4. **Testen**: Beim naechsten relevanten Anlass pruefen ob der Skill funktioniert

### 5d: Skill-Hygiene

- Skills die nie getriggert werden → pruefen ob noetig, ggf. entfernen
- Skills mit schlechter Anleitung → verbessern
- Doppelte Skills → zusammenfuehren

### Leitfragen
- "Was haette ich diese Woche besser machen koennen?"
- "Welche Handgriffe mache ich immer wieder von Hand?"
- "Wo habe ich etwas gesucht und nicht gefunden?"
- "Welchen Skill wuensche ich mir, den es noch nicht gibt?"

---

## Phase 6: Strategie-Review

Lies `memory/meta/strategy.md`:
- Hat die Tier-Einteilung geholfen? Wurde Kompression reduziert?
- Welche Infos wurden oft gesucht und nicht schnell gefunden? → hoeher einstufen
- Welche Infos wurden nie gebraucht? → tiefer oder raus
- Experiment-Log updaten mit Beobachtungen

Wenn Strategie-Aenderung sinnvoll → anpassen + begruenden.

---

## Phase 7: Selbst-Planung

Vorausdenken:
- Welche Recherchen waeren nuetzlich? → Scheduler Task anlegen
- Offene Fragen fuer naechsten User-Kontakt? → vormerken
- Wissensluecken identifiziert? → Plan zum Fuellen
- Neue Skill-Ideen? → als TODO vormerken oder direkt umsetzen

---

## Phase 8: Commit & Report

1. Falls Phase 1 uncommitted Session-Arbeit gefunden hat → diese zuerst als eigenen Commit sichern (z.B. `"Session-Arbeit gesichert"`)
2. `git add memory/ SOUL.md CLAUDE.md .claude/skills/ && git commit -m "REM [Datum]: Was konsolidiert/gelernt"`
   → Voller Git-Workflow: memory/meta/procedures.md
3. Nachricht an User NUR wenn etwas Wichtiges:
   - Was wurde umstrukturiert
   - Neue Patterns / Erkenntnisse
   - Geplante Tasks

   Wenn nichts Wichtiges: **kein Message**. Kein Laerm.

---

## Regeln

- **Immer lesen bevor schreiben** — kein blindes Ueberschreiben
- **Weniger ist mehr** — lieber wenige praezise Aenderungen als viele oberflaechliche
- **User nicht wecken** — ausser es ist wirklich wichtig
- **Struktur > Inhalt** — erst richtigen Platz finden, dann ablegen
- **Strategie darf sich aendern** — lebendes System, nicht starres Regelwerk
