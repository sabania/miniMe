#!/bin/bash
# Letzte N Emails aus Mail.app Inbox lesen
# Usage: bash read-emails.sh [count]
COUNT=${1:-10}
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
    echo "Fehler: count muss eine Zahl sein"; exit 1
fi

osascript <<EOF
tell application "Mail"
    set inboxMessages to messages of inbox
    set msgList to {}
    repeat with i from 1 to (count of inboxMessages)
        if i > $COUNT then exit repeat
        set msg to item i of inboxMessages
        set msgSubject to subject of msg
        set msgSender to sender of msg
        set msgDate to date received of msg
        set msgRead to read status of msg
        set end of msgList to (i as string) & " | " & (msgDate as string) & " | " & msgSender & " | " & msgSubject & " | gelesen: " & msgRead
    end repeat
    return msgList as string
end tell
EOF
