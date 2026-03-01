#!/bin/bash
# Read events for the next N days from Calendar.app
# Usage: bash read-calendar.sh [days]
DAYS=${1:-7}
if ! [[ "$DAYS" =~ ^[0-9]+$ ]]; then
    echo "Error: days must be a number"; exit 1
fi

osascript <<EOF
tell application "Calendar"
    set today to current date
    set time of today to 0
    set endDate to today + ($DAYS * days)

    set eventList to {}
    repeat with cal in calendars
        set calName to name of cal
        try
            set calEvents to (every event of cal whose start date ≥ today and start date < endDate)
            repeat with evt in calEvents
                set evtStart to start date of evt
                set evtEnd to end date of evt
                set evtSummary to summary of evt
                set evtLoc to ""
                try
                    set evtLoc to location of evt
                end try
                set end of eventList to (evtStart as string) & " - " & (evtEnd as string) & " | " & calName & " | " & evtSummary & " | " & evtLoc
            end repeat
        end try
    end repeat

    if (count of eventList) = 0 then
        return "No events in the next $DAYS days"
    end if
    return eventList as string
end tell
EOF
