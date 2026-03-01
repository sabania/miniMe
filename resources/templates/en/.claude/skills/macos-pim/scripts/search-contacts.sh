#!/bin/bash
# Search contacts in Contacts.app
# Usage: bash search-contacts.sh "name"
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

QUERY="$1"

if [ -z "$QUERY" ]; then
    echo "Usage: bash $0 \"name\""
    exit 1
fi

SAFE_QUERY="$(esc "$QUERY")"

osascript <<EOF
tell application "Contacts"
    set results to {}
    set matchedPeople to (every person whose name contains "$SAFE_QUERY")
    repeat with p in matchedPeople
        set pName to name of p
        set pEmails to ""
        set pPhones to ""
        try
            set pEmails to value of every email of p as string
        end try
        try
            set pPhones to value of every phone of p as string
        end try
        set end of results to pName & " | " & pEmails & " | " & pPhones
    end repeat
    if (count of results) = 0 then
        return "No contact found for: $SAFE_QUERY"
    end if
    return results as string
end tell
EOF
