# create-event.ps1 — Outlook-Termin erstellen
# Aufruf: powershell -NoProfile -File scripts/create-event.ps1 -Subject "..." -Start "2025-01-15 14:00" [-Duration 60] [-Location "..."] [-Body "..."]

param(
    [Parameter(Mandatory=$true)]
    [string]$Subject,
    [Parameter(Mandatory=$true)]
    [string]$Start,
    [int]$Duration = 60,
    [string]$Location = "",
    [string]$Body = ""
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$apt = $ol.CreateItem(1)
$apt.Subject = $Subject
$apt.Start = $Start
$apt.Duration = $Duration
if ($Location) { $apt.Location = $Location }
if ($Body) { $apt.Body = $Body }
$apt.Save()

@{ status = "created"; subject = $Subject; start = $Start; duration = $Duration } | ConvertTo-Json
