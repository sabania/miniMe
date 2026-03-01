---
name: whisper-transcribe
description: Transcribe audio files (OGG, WAV, MP3, FLAC) — local speech-to-text with whisper.cpp.
user-invocable: true
---

Transcribe audio files using whisper.cpp (local, no API call needed).

## Setup

- **Binary**: `tools/whisper/Release/whisper-cli` (macOS/Linux) or `whisper-cli.exe` (Windows)
- **Model**: `tools/whisper/models/ggml-base.bin` (148MB, base)
- **Supported formats**: OGG, WAV, MP3, FLAC
- **Languages**: 99 languages including English, German
- **ffmpeg**: Must be installed — `brew install ffmpeg` (macOS) or `winget install Gyan.FFmpeg` (Windows)

All paths relative to workspace root.

## One-Liner Script

```bash
# English (default)
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg en

# German
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg de

# Any language
bash .claude/skills/whisper-transcribe/scripts/transcribe.sh <audio-file> <language>
```

The script automatically:
1. Detects format (OGG/MP3/FLAC → ffmpeg → WAV 16kHz mono)
2. WAV files are passed through without conversion
3. Transcription with whisper.cpp (base model)
4. Cleanup of temporary WAV file

## Manual Usage

```bash
# Basic transcription (English)
tools/whisper/Release/whisper-cli \
  -m tools/whisper/models/ggml-base.bin \
  -l en \
  -f <audio-file>

# With text output to file
tools/whisper/Release/whisper-cli \
  -m tools/whisper/models/ggml-base.bin \
  -l en -otxt \
  -f <audio-file>
```

## Key Options

| Option | Description |
|--------|------------|
| `-l LANG` | Language (en, de, fr, ...) — Default: auto |
| `-t N` | Threads (Default: 4) |
| `-otxt` | Output as .txt file |
| `-ovtt` | Output as .vtt (subtitles) |
| `--translate` | Translate to English |
| `--no-timestamps` | No timestamps in output |

## Models

| Model | Size | Quality | File |
|-------|------|---------|------|
| base | 148MB | good for short audio | ggml-base.bin |
| small | 466MB | better for longer audio | ggml-small.bin |
| medium | 1.5GB | best quality | ggml-medium.bin |

Download a larger model:
```bash
curl -sL -o tools/whisper/models/ggml-small.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
```

## Manual Workflow (WhatsApp Voice)

If the script doesn't work, steps individually:

1. Voice message arrives as OGG (Opus codec) in `tmp/media/`
2. Convert OGG → WAV (whisper.cpp can't read WhatsApp OGG directly):
   ```bash
   ffmpeg -i tmp/media/<file>.ogg -ar 16000 -ac 1 tmp/media/<file>.wav
   ```
3. Transcribe:
   ```bash
   tools/whisper/Release/whisper-cli \
     -m tools/whisper/models/ggml-base.bin \
     -l en --no-timestamps \
     -f tmp/media/<file>.wav
   ```
4. Process transcript
5. Delete temporary WAV file

## After Transcription

- **If the transcription is unclear or obviously wrong** (strange words, illogical sentences, choppy phrases): **ALWAYS ask the user** what they meant. Don't guess or interpret.
- Show the transcription to the user and ask when unsure: "Did you mean ...?"
- Only process/execute the message after clarification.

## Notes

- Runs on CPU (~4-5s for short audio with base model)
- **WhatsApp OGG (Opus codec) must be converted to WAV via ffmpeg first** — direct reading fails
- WAV format: 16kHz, mono (`-ar 16000 -ac 1`)
