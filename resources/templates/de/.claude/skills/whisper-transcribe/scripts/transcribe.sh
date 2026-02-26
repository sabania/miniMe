#!/bin/bash
# whisper-transcribe: OGG/MP3/FLAC → WAV → Whisper → Text
# Usage: bash .claude/skills/whisper-transcribe/scripts/transcribe.sh <audio-datei> [sprache]
# Beispiel: bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg de

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# ffmpeg: im PATH suchen, Fallback auf bekannte Pfade
FFMPEG="$(command -v ffmpeg 2>/dev/null)" || FFMPEG=""
if [ -z "$FFMPEG" ]; then
    for candidate in \
        "$WORKSPACE/tools/ffmpeg.exe" \
        "C:/Users/$USER/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe" \
        "/usr/local/bin/ffmpeg" \
        "/usr/bin/ffmpeg"; do
        if [ -f "$candidate" ]; then FFMPEG="$candidate"; break; fi
    done
fi
if [ -z "$FFMPEG" ]; then
    echo "Fehler: ffmpeg nicht gefunden. Installieren: winget install Gyan.FFmpeg"
    exit 1
fi

# Whisper Binary + Modell im workspace/tools/whisper/
WHISPER="$WORKSPACE/tools/whisper/Release/whisper-cli.exe"
MODEL="$WORKSPACE/tools/whisper/models/ggml-base.bin"

if [ ! -f "$WHISPER" ]; then
    echo "Fehler: whisper-cli.exe nicht gefunden: $WHISPER"
    exit 1
fi
if [ ! -f "$MODEL" ]; then
    echo "Fehler: Whisper-Modell nicht gefunden: $MODEL"
    echo "Download: curl -sL -o \"$MODEL\" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    exit 1
fi

INPUT="$1"
LANG="${2:-de}"

if [ -z "$INPUT" ]; then
    echo "Usage: bash $0 <audio-datei> [sprache]"
    echo "Beispiel: bash $0 tmp/media/voice.ogg de"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "Fehler: Datei nicht gefunden: $INPUT"
    exit 1
fi

EXT="${INPUT##*.}"
BASENAME="${INPUT%.*}"
WAV_FILE="${BASENAME}_tmp.wav"
NEEDS_CLEANUP=0

# Konvertierung wenn nicht WAV
if [ "${EXT,,}" != "wav" ]; then
    echo "[1/3] Konvertiere .$EXT → WAV ..."
    "$FFMPEG" -y -i "$INPUT" -ar 16000 -ac 1 "$WAV_FILE" -loglevel error 2>&1
    if [ $? -ne 0 ]; then
        echo "Fehler: ffmpeg Konvertierung fehlgeschlagen"
        exit 1
    fi
    NEEDS_CLEANUP=1
else
    echo "[1/3] WAV erkannt, keine Konvertierung noetig."
    WAV_FILE="$INPUT"
fi

echo "[2/3] Transkribiere mit whisper.cpp (Sprache: $LANG) ..."
"$WHISPER" -m "$MODEL" -l "$LANG" --no-timestamps -f "$WAV_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "Fehler: Transkription fehlgeschlagen"
    [ "$NEEDS_CLEANUP" = "1" ] && rm -f "$WAV_FILE"
    exit 1
fi

# Cleanup temporaere WAV
if [ "$NEEDS_CLEANUP" = "1" ]; then
    rm -f "$WAV_FILE"
    echo "[3/3] Cleanup: temporaere WAV geloescht."
else
    echo "[3/3] Kein Cleanup noetig."
fi
