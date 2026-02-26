# read-emails.ps1 — Letzte N Emails aus dem Posteingang lesen
# Aufruf: powershell -NoProfile -File scripts/read-emails.ps1 [-Count 10]

param(
    [int]$Count = 10
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$inbox = $ns.GetDefaultFolder(6)
$items = $inbox.Items
$items.Sort('[ReceivedTime]', $true)

$results = @()
for ($i = 1; $i -le [Math]::Min($Count, $items.Count); $i++) {
    $m = $items.Item($i)
    $results += @{
        Subject = $m.Subject
        From    = $m.SenderName
        Date    = $m.ReceivedTime.ToString('yyyy-MM-dd HH:mm')
        EntryID = $m.EntryID
        Unread  = $m.UnRead
    }
}

$results | ConvertTo-Json -Depth 3
