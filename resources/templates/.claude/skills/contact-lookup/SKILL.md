---
name: contact-lookup
description: Personen und Kontakte nachschlagen — bei Fragen zu Personen, Kontaktdaten oder erwaehnte Namen.
user-invocable: false
---

## Ablauf

1. Lies CLAUDE.local.md — dort ist die aktuelle Kontaktliste mit Nummern und Beschreibungen
2. Lies memory/people/CLAUDE.md fuer die Schnell-Uebersicht
3. Suche nach Name, Spitzname oder Rolle in der Tabelle
4. Lies memory/people/<vorname-nachname>.md fuer Details
5. Falls nicht gefunden: Grep ueber memory/ nach dem Namen
6. Falls komplett unbekannt: dem User sagen, anbieten Eintrag zu erstellen

## Personen-Dateien enthalten
- Name, Rolle, Beziehung zum User
- Kontaktdaten (Telefon, Email)
- Kontext (woher bekannt, welches Projekt)
- Letzte Interaktionen
- Wichtige Details und Notizen

## Namens-Konventionen
- Dateien: vorname-nachname.md (lowercase, Bindestriche)
- "Also known as" Spalte in CLAUDE.md fuer Spitznamen
  Beispiel: "der Peter" → peter-mueller.md
