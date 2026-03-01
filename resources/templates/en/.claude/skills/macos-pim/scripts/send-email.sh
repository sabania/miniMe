#!/bin/bash
# Send email via Mail.app
# Usage: bash send-email.sh "to@email.com" "Subject" "Body" [from@email.com]
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

TO="$1"
SUBJECT="$2"
BODY="$3"
FROM="${4:-}"

if [ -z "$TO" ] || [ -z "$SUBJECT" ] || [ -z "$BODY" ]; then
    echo "Usage: bash $0 \"to@email.com\" \"Subject\" \"Body\" [from@email.com]"
    exit 1
fi

SAFE_TO="$(esc "$TO")"
SAFE_SUBJECT="$(esc "$SUBJECT")"
SAFE_BODY="$(esc "$BODY")"

if [ -n "$FROM" ]; then
    SAFE_FROM="$(esc "$FROM")"
    SENDER_LINE="set sender to \"$SAFE_FROM\""
else
    SENDER_LINE=""
fi

osascript <<EOF
tell application "Mail"
    set newMessage to make new outgoing message with properties {subject:"$SAFE_SUBJECT", content:"$SAFE_BODY", visible:false}
    tell newMessage
        make new to recipient at end of to recipients with properties {address:"$SAFE_TO"}
        $SENDER_LINE
    end tell
    send newMessage
    return "OK: Email sent to $SAFE_TO"
end tell
EOF
