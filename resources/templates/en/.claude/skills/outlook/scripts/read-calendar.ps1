# read-calendar.ps1 — Read calendar events in date range
# Usage: powershell -NoProfile -File scripts/read-calendar.ps1 [-Days 7]

param(
    [int]$Days = 7
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$cal = $ns.GetDefaultFolder(9)
$start = (Get-Date).ToString('MM/dd/yyyy')
$end = (Get-Date).AddDays($Days).ToString('MM/dd/yyyy')

$items = $cal.Items
$items.Sort('[Start]')
$items.IncludeRecurrences = $true
$filtered = $items.Restrict("[Start] >= '$start' AND [Start] <= '$end'")

$results = @()
foreach ($e in $filtered) {
    $results += @{
        Subject  = $e.Subject
        Start    = $e.Start.ToString('yyyy-MM-dd HH:mm')
        End      = $e.End.ToString('yyyy-MM-dd HH:mm')
        Location = $e.Location
        AllDay   = $e.AllDayEvent
    }
    if ($results.Count -ge 50) { break }
}

$results | ConvertTo-Json -Depth 3
