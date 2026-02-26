---
name: whisper-transcribe
description: Audio-Dateien transkribieren (OGG, WAV, MP3, FLAC) — Speech-to-Text mit whisper.cpp lokal.
user-invocable: true
---

Transkribiere Audio-Dateien mit whisper.cpp (lokal, kein API-Call noetig).

## Setup

- **Binary**: `tools/whisper/Release/whisper-cli.exe`
- **Modell**: `tools/whisper/models/ggml-base.bin` (148MB, base)
- **Unterstuetzte Formate**: OGG, WAV, MP3, FLAC
- **Sprachen**: 99 Sprachen inkl. Deutsch, Englisch
- **ffmpeg**: Muss installiert sein (`winget install Gyan.FFmpeg`)

Alle Pfade relativ zum Workspace-Root.

## One-Liner Script

```bash
# Deutsch (Default)
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg

# Englisch
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg en

# Beliebige Sprache
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh <audio-datei> <sprache>
```

Das Script macht automatisch:
1. Erkennt Format (OGG/MP3/FLAC → ffmpeg → WAV 16kHz mono)
2. WAV wird direkt durchgereicht ohne Konvertierung
3. Transkription mit whisper.cpp (base-Modell)
4. Cleanup der temporaeren WAV-Datei

## Manuelle Verwendung

```bash
# Basis-Transkription (Deutsch)
tools/whisper/Release/whisper-cli.exe \
  -m tools/whisper/models/ggml-base.bin \
  -l de \
  -f <audio-datei>

# Mit Textausgabe in Datei
tools/whisper/Release/whisper-cli.exe \
  -m tools/whisper/models/ggml-base.bin \
  -l de -otxt \
  -f <audio-datei>
```

## Wichtige Optionen

| Option | Beschreibung |
|--------|-------------|
| `-l LANG` | Sprache (de, en, fr, ...) — Default: auto |
| `-t N` | Threads (Default: 4) |
| `-otxt` | Ausgabe als .txt Datei |
| `-ovtt` | Ausgabe als .vtt (Untertitel) |
| `--translate` | Uebersetze nach Englisch |
| `--no-timestamps` | Keine Zeitstempel ausgeben |

## Modelle

| Modell | Groesse | Qualitaet | Datei |
|--------|---------|-----------|-------|
| base | 148MB | gut fuer kurze Audio | ggml-base.bin |
| small | 466MB | besser fuer laengere Audio | ggml-small.bin |
| medium | 1.5GB | beste Qualitaet | ggml-medium.bin |

Groesseres Modell runterladen:
```bash
curl -sL -o tools/whisper/models/ggml-small.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
```

## Manueller Workflow (WhatsApp Voice)

Falls das Script nicht geht, Schritte einzeln:

1. Voice-Nachricht landet als OGG (Opus-Codec) in `tmp/media/`
2. OGG → WAV konvertieren (whisper.cpp kann WhatsApp-OGG nicht direkt lesen):
   ```bash
   ffmpeg -i tmp/media/<datei>.ogg -ar 16000 -ac 1 tmp/media/<datei>.wav
   ```
3. Transkribieren:
   ```bash
   tools/whisper/Release/whisper-cli.exe \
     -m tools/whisper/models/ggml-base.bin \
     -l de --no-timestamps \
     -f tmp/media/<datei>.wav
   ```
4. Transkript verarbeiten
5. Temporaere WAV-Datei loeschen

## Nach der Transkription

- **Wenn die Transkription unklar oder offensichtlich fehlerhaft ist** (seltsame Woerter, unlogische Saetze, abgehackte Phrasen): **IMMER beim User nachfragen** was gemeint war. Nicht raten oder interpretieren.
- Transkription dem User zeigen und bei Unsicherheit fragen: "Meintest du ...?"
- Erst nach Klaerung die Nachricht verarbeiten/ausfuehren.

## Hinweise

- Laeuft auf CPU (~4-5s fuer kurze Audio mit base-Modell)
- **WhatsApp OGG (Opus-Codec) muss erst via ffmpeg zu WAV konvertiert werden** — direktes Lesen schlaegt fehl
- WAV-Format: 16kHz, Mono (`-ar 16000 -ac 1`)
