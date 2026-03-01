#!/bin/bash
# Neuen Termin in Calendar.app erstellen
# Usage: bash create-event.sh "Kalender" "Titel" "2026-03-01 14:00" "2026-03-01 15:00" [location] [notes]
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

CALENDAR="$1"
TITLE="$2"
START="$3"
END="$4"
LOCATION="${5:-}"
NOTES="${6:-}"

if [ -z "$CALENDAR" ] || [ -z "$TITLE" ] || [ -z "$START" ] || [ -z "$END" ]; then
    echo "Usage: bash $0 \"Kalender\" \"Titel\" \"YYYY-MM-DD HH:MM\" \"YYYY-MM-DD HH:MM\" [location] [notes]"
    exit 1
fi

SAFE_CALENDAR="$(esc "$CALENDAR")"
SAFE_TITLE="$(esc "$TITLE")"
SAFE_START="$(esc "$START")"
SAFE_END="$(esc "$END")"

# Location und Notes Properties aufbauen
EXTRA_PROPS=""
if [ -n "$LOCATION" ]; then
    SAFE_LOCATION="$(esc "$LOCATION")"
    EXTRA_PROPS="$EXTRA_PROPS, location:\"$SAFE_LOCATION\""
fi
if [ -n "$NOTES" ]; then
    SAFE_NOTES="$(esc "$NOTES")"
    EXTRA_PROPS="$EXTRA_PROPS, description:\"$SAFE_NOTES\""
fi

osascript <<EOF
tell application "Calendar"
    set startDate to date "$SAFE_START"
    set endDate to date "$SAFE_END"
    tell calendar "$SAFE_CALENDAR"
        make new event with properties {summary:"$SAFE_TITLE", start date:startDate, end date:endDate${EXTRA_PROPS}}
    end tell
    return "OK: Event erstellt in $SAFE_CALENDAR — $SAFE_TITLE ($SAFE_START bis $SAFE_END)"
end tell
EOF
