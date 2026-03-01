#!/bin/bash
# whisper-transcribe: OGG/MP3/FLAC → WAV → Whisper → Text
# Usage: bash .claude/skills/whisper-transcribe/scripts/transcribe.sh <audio-file> [language]
# Example: bash .claude/skills/whisper-transcribe/scripts/transcribe.sh tmp/media/voice.ogg en

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# ffmpeg: search PATH, fallback to known locations
FFMPEG="$(command -v ffmpeg 2>/dev/null)" || FFMPEG=""
if [ -z "$FFMPEG" ]; then
    for candidate in \
        "/opt/homebrew/bin/ffmpeg" \
        "$WORKSPACE/tools/ffmpeg.exe" \
        "C:/Users/$USER/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe" \
        "/usr/local/bin/ffmpeg" \
        "/usr/bin/ffmpeg"; do
        if [ -f "$candidate" ]; then FFMPEG="$candidate"; break; fi
    done
fi
if [ -z "$FFMPEG" ]; then
    echo "Error: ffmpeg not found. Install: brew install ffmpeg (macOS) or winget install Gyan.FFmpeg (Windows)"
    exit 1
fi

# Whisper binary + model in workspace/tools/whisper/
# macOS: whisper-cli or Release/bin/whisper-cli, Windows: whisper-cli.exe
WHISPER=""
for candidate in \
    "$WORKSPACE/tools/whisper/Release/bin/whisper-cli" \
    "$WORKSPACE/tools/whisper/Release/whisper-cli.exe" \
    "$WORKSPACE/tools/whisper/Release/whisper-cli"; do
    if [ -f "$candidate" ]; then WHISPER="$candidate"; break; fi
done
MODEL="$WORKSPACE/tools/whisper/models/ggml-base.bin"

if [ -z "$WHISPER" ] || [ ! -f "$WHISPER" ]; then
    echo "Error: whisper-cli not found in $WORKSPACE/tools/whisper/"
    exit 1
fi
if [ ! -f "$MODEL" ]; then
    echo "Error: Whisper model not found: $MODEL"
    echo "Download: curl -sL -o \"$MODEL\" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    exit 1
fi

INPUT="$1"
LANG="${2:-en}"

if [ -z "$INPUT" ]; then
    echo "Usage: bash $0 <audio-file> [language]"
    echo "Example: bash $0 tmp/media/voice.ogg en"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

EXT="${INPUT##*.}"
BASENAME="${INPUT%.*}"
WAV_FILE="${BASENAME}_tmp.wav"
NEEDS_CLEANUP=0

# Convert if not WAV
EXT_LOWER="$(echo "$EXT" | tr '[:upper:]' '[:lower:]')"
if [ "$EXT_LOWER" != "wav" ]; then
    echo "[1/3] Converting .$EXT → WAV ..."
    "$FFMPEG" -y -i "$INPUT" -ar 16000 -ac 1 "$WAV_FILE" -loglevel error 2>&1
    if [ $? -ne 0 ]; then
        echo "Error: ffmpeg conversion failed"
        exit 1
    fi
    NEEDS_CLEANUP=1
else
    echo "[1/3] WAV detected, no conversion needed."
    WAV_FILE="$INPUT"
fi

echo "[2/3] Transcribing with whisper.cpp (language: $LANG) ..."
"$WHISPER" -m "$MODEL" -l "$LANG" --no-timestamps -f "$WAV_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Transcription failed"
    [ "$NEEDS_CLEANUP" = "1" ] && rm -f "$WAV_FILE"
    exit 1
fi

# Cleanup temporary WAV
if [ "$NEEDS_CLEANUP" = "1" ]; then
    rm -f "$WAV_FILE"
    echo "[3/3] Cleanup: temporary WAV deleted."
else
    echo "[3/3] No cleanup needed."
fi
