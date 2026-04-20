param(
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir "kidlearn-$timestamp.sql"

Write-Host "Creating backup at $backupFile"
docker compose exec -T db mysqldump -ukidlearn -pkidlearn123 kidlearn_db > $backupFile
Write-Host "Backup complete"
