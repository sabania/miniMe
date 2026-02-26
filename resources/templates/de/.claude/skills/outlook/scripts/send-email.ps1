# send-email.ps1 — Email senden
# Aufruf: powershell -NoProfile -File scripts/send-email.ps1 -To "..." -Subject "..." -Body "..."

param(
    [Parameter(Mandatory=$true)]
    [string]$To,
    [Parameter(Mandatory=$true)]
    [string]$Subject,
    [Parameter(Mandatory=$true)]
    [string]$Body,
    [string]$CC = ""
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$mail = $ol.CreateItem(0)
$mail.To = $To
$mail.Subject = $Subject
$mail.Body = $Body
if ($CC) { $mail.CC = $CC }
$mail.Send()

@{ status = "sent"; to = $To; subject = $Subject } | ConvertTo-Json
