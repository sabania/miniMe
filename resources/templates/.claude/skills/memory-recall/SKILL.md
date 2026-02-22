---
name: memory-recall
description: Wissen aus dem Gedaechtnis abrufen — Entscheidungen, Fehler, Muster, Projekte oder User-Praeferenzen nachschlagen.
user-invocable: false
---

Nebst deiner eingebauten Auto-Memory Funktion gibt dir dieser Skill gezielten Zugriff
auf dein strukturiertes Wissen. Schneller als Suchen — die Routing-Tabelle zeigt direkt wo was liegt.

## Abruf-Prozess

1. Lies memory/CLAUDE.md — dein Index zu allem
2. Der Index hat eine Routing-Tabelle mit Trigger-Phrases
3. Lies die verlinkte Detail-Datei
4. Falls unklar wo: Grep ueber memory/ nach Stichworten

## Dateien und ihre Inhalte
- memory/user/profile.md — Wer ist der User, Biografie, Beruf
- memory/user/preferences.md — Vorlieben, Arbeitsweise, Tech-Stack
- memory/user/patterns.md — Wiederkehrende Muster, Fehler, Regeln
- memory/people/CLAUDE.md — Schnelle Personen-Uebersicht
- memory/people/<name>.md — Detail-Infos zu einer Person
- memory/projects/CLAUDE.md — Alle Projekte mit Status
- memory/projects/<name>.md — Projekt-spezifisches Wissen
- memory/decisions/CLAUDE.md — Entscheidungs-Log
- memory/ideas/_inbox.md — Ideen und Notizen
- memory/journal/_current-week.md — Laufende Wochen-Notizen

## Tipps
- memory/CLAUDE.md Index als Startpunkt — pruefe ob verlinkte Dateien existieren
- CLAUDE.md Dateien in Ordnern sind Lookup-Tabellen — schneller als einzelne Dateien lesen
- Git History nutzen: `git log --oneline memory/` fuer zeitliche Achse
