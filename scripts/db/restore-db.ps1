param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "Restoring database from $BackupFile"
Get-Content $BackupFile | docker compose exec -T db mysql -ukidlearn -pkidlearn123 kidlearn_db
Write-Host "Restore complete"
