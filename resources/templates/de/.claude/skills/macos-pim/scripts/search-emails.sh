#!/bin/bash
# Emails suchen in Mail.app Inbox (nach Betreff oder Absender)
# Usage: bash search-emails.sh "suchbegriff" [count]
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

QUERY="$1"
COUNT=${2:-20}

if [ -z "$QUERY" ]; then
    echo "Usage: bash $0 \"suchbegriff\" [count]"
    exit 1
fi
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
    echo "Fehler: count muss eine Zahl sein"; exit 1
fi

SAFE_QUERY="$(esc "$QUERY")"

osascript <<EOF
tell application "Mail"
    set inboxMessages to messages of inbox
    set results to {}
    set found to 0
    repeat with msg in inboxMessages
        if found ≥ $COUNT then exit repeat
        set msgSubject to subject of msg
        set msgSender to sender of msg
        if msgSubject contains "$SAFE_QUERY" or msgSender contains "$SAFE_QUERY" then
            set msgDate to date received of msg
            set found to found + 1
            set end of results to (found as string) & " | " & (msgDate as string) & " | " & msgSender & " | " & msgSubject
        end if
    end repeat
    if found = 0 then
        return "Keine Mails gefunden fuer: $SAFE_QUERY"
    end if
    return results as string
end tell
EOF
