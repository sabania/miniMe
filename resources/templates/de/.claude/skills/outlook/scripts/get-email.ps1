# get-email.ps1 — Einzelne Email per EntryID lesen
# Aufruf: powershell -NoProfile -File scripts/get-email.ps1 -EntryID "..."

param(
    [Parameter(Mandatory=$true)]
    [string]$EntryID
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$m = $ns.GetItemFromID($EntryID)

@{
    Subject = $m.Subject
    From    = $m.SenderName
    To      = $m.To
    CC      = $m.CC
    Date    = $m.ReceivedTime.ToString('yyyy-MM-dd HH:mm')
    Body    = $m.Body.Substring(0, [Math]::Min(3000, $m.Body.Length))
    Unread  = $m.UnRead
} | ConvertTo-Json
