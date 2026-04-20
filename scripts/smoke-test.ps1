$ErrorActionPreference = "Stop"

Write-Host "Checking frontend scripts"
node --check js\game.js
node --check js\scores.js
node --check js\teacher.js
node --check js\admin.js

Write-Host "Checking PHP syntax in container"
docker compose run --rm web php -l /var/www/html/api/backend.php

Write-Host "Health check"
try {
  $health = Invoke-RestMethod -Uri "http://localhost:8080/api/backend.php?action=health" -Method Get
  $health | ConvertTo-Json -Depth 4
} catch {
  Write-Warning "Health endpoint is not reachable. Start the stack with docker compose up -d before running the health check."
}

Write-Host "Smoke test complete"
