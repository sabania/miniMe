#!/bin/bash
# Alle Kontakte auflisten aus Contacts.app
# Usage: bash list-contacts.sh [count]
COUNT=${1:-50}
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
    echo "Fehler: count muss eine Zahl sein"; exit 1
fi

osascript <<EOF
tell application "Contacts"
    set contactList to {}
    set ppl to every person
    set total to count of ppl
    repeat with i from 1 to total
        if i > $COUNT then exit repeat
        set p to item i of ppl
        set pName to name of p
        set pEmails to ""
        set pPhones to ""
        try
            set pEmails to value of every email of p as string
        end try
        try
            set pPhones to value of every phone of p as string
        end try
        set end of contactList to (i as string) & " | " & pName & " | " & pEmails & " | " & pPhones
    end repeat
    return (total as string) & " Kontakte total. Zeige erste $COUNT:" & return & return & (contactList as string)
end tell
EOF
