# search-emails.ps1 — Emails im Posteingang suchen
# Aufruf: powershell -NoProfile -File scripts/search-emails.ps1 -Query "..." [-Count 20]

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,
    [int]$Count = 20
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$inbox = $ns.GetDefaultFolder(6)

# DASL-Filter: Suche in Betreff und Absendername
$filter = "@SQL=""urn:schemas:httpmail:subject"" LIKE '%$Query%' OR ""urn:schemas:httpmail:fromemail"" LIKE '%$Query%' OR ""urn:schemas:httpmail:fromname"" LIKE '%$Query%'"
$items = $inbox.Items.Restrict($filter)
$items.Sort('[ReceivedTime]', $true)

$results = @()
foreach ($m in $items) {
    $results += @{
        Subject = $m.Subject
        From    = $m.SenderName
        Date    = $m.ReceivedTime.ToString('yyyy-MM-dd HH:mm')
        EntryID = $m.EntryID
    }
    if ($results.Count -ge $Count) { break }
}

$results | ConvertTo-Json -Depth 3
