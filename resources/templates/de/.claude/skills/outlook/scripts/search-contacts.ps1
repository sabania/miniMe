# search-contacts.ps1 — Outlook-Kontakte suchen
# Aufruf: powershell -NoProfile -File scripts/search-contacts.ps1 -Query "..."

param(
    [Parameter(Mandatory=$true)]
    [string]$Query
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$contacts = $ns.GetDefaultFolder(10)

$filter = "@SQL=""urn:schemas:contacts:cn"" LIKE '%$Query%' OR ""urn:schemas:contacts:email1"" LIKE '%$Query%' OR ""urn:schemas:contacts:o"" LIKE '%$Query%'"
$items = $contacts.Items.Restrict($filter)

$results = @()
foreach ($c in $items) {
    $results += @{
        Name    = $c.FullName
        Email   = $c.Email1Address
        Phone   = $c.BusinessTelephoneNumber
        Mobile  = $c.MobileTelephoneNumber
        Company = $c.CompanyName
    }
    if ($results.Count -ge 20) { break }
}

$results | ConvertTo-Json -Depth 3
