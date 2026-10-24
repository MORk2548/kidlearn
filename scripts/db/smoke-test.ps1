$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  # Windows PowerShell 5.1 turns native stderr (docker progress lines) into terminating errors under Stop.
  $ErrorActionPreference = "Continue"
  & $Command @Arguments 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Invoke-KidLearnApi {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [string]$Method = "GET",
    [object]$Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [string]$CsrfToken = ""
  )

  $headers = @{}
  if ($CsrfToken) { $headers["X-CSRF-Token"] = $CsrfToken }

  $params = @{
    Uri = $Uri
    Method = $Method
    Headers = $headers
  }
  if ($Session) { $params.WebSession = $Session }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  Invoke-RestMethod @params
}

$baseUrl = $env:KIDLEARN_BASE_URL
if (-not $baseUrl) { $baseUrl = "http://localhost:8080" }
$apiUrl = "$baseUrl/api/backend.php"

Write-Host "Checking frontend scripts"
Get-ChildItem js -Filter "*.js" | Sort-Object Name | ForEach-Object {
  Invoke-CheckedCommand node --check $_.FullName
}

Write-Host "Checking PHP syntax in container"
Invoke-CheckedCommand docker compose run --rm web php -l /var/www/html/api/backend.php

Write-Host "Health check"
$healthReachable = $false
try {
  $health = Invoke-KidLearnApi -Uri "${apiUrl}?action=health"
  if (-not $health.ok -or $health.status -ne "healthy" -or -not $health.db -or -not $health.checks.database) {
    throw "Unexpected health response: $($health | ConvertTo-Json -Depth 6)"
  }
  $health | ConvertTo-Json -Depth 6
  $healthReachable = $true
} catch {
  Write-Warning "Health endpoint is not reachable or not healthy. Start the stack with docker compose up -d before running HTTP smoke checks. $($_.Exception.Message)"
}

if ($healthReachable) {
  Write-Host "Checking private files are not served"
  foreach ($path in @(".env", ".git/config", "kidlearn_full.sql", "scripts/db/smoke-test.ps1", "README.md")) {
    try {
      Invoke-WebRequest -Uri "${baseUrl}/$path" -Method Get -UseBasicParsing | Out-Null
      throw "$path is publicly readable"
    } catch {
      $statusCode = $_.Exception.Response.StatusCode.value__
      if ($statusCode -ne 403) { throw }
    }
  }

  Write-Host "Checking unauthenticated endpoint returns 401"
  try {
    Invoke-KidLearnApi -Uri "${apiUrl}?action=subjects" | Out-Null
    throw "subjects unexpectedly succeeded without login"
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 401) { throw }
  }

  $adminUser = $env:SMOKE_ADMIN_USER
  if (-not $adminUser) { $adminUser = "admin" }
  $adminPassword = $env:SMOKE_ADMIN_PASSWORD
  if (-not $adminPassword) { $adminPassword = "password" }
  $studentUser = $env:SMOKE_STUDENT_USER
  if (-not $studentUser) { $studentUser = "student01" }
  $studentPassword = $env:SMOKE_STUDENT_PASSWORD
  if (-not $studentPassword) { $studentPassword = "password" }

  Write-Host "Checking login/logout and CSRF"
  $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $adminLogin = Invoke-KidLearnApi -Uri "${apiUrl}?action=login" -Method POST -Body @{ username = $adminUser; password = $adminPassword } -Session $adminSession
  if (-not $adminLogin.ok -or -not $adminLogin.csrf_token) { throw "Admin login did not return csrf_token" }
  $adminLogout = Invoke-KidLearnApi -Uri "${apiUrl}?action=logout" -Method POST -Session $adminSession -CsrfToken $adminLogin.csrf_token
  if (-not $adminLogout.ok) { throw "Admin logout failed" }

  Write-Host "Checking wrong role gets 403"
  $studentSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $studentLogin = Invoke-KidLearnApi -Uri "${apiUrl}?action=login" -Method POST -Body @{ username = $studentUser; password = $studentPassword } -Session $studentSession
  if (-not $studentLogin.ok -or -not $studentLogin.csrf_token) { throw "Student login did not return csrf_token" }
  try {
    Invoke-KidLearnApi -Uri "${apiUrl}?action=admin_users" -Session $studentSession | Out-Null
    throw "admin_users unexpectedly succeeded for student"
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 403) { throw }
  }
  Invoke-KidLearnApi -Uri "${apiUrl}?action=logout" -Method POST -Session $studentSession -CsrfToken $studentLogin.csrf_token | Out-Null

  Write-Host "Checking password defaults are rejected"
  $adminSession2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $adminLogin2 = Invoke-KidLearnApi -Uri "${apiUrl}?action=login" -Method POST -Body @{ username = $adminUser; password = $adminPassword } -Session $adminSession2
  try {
    Invoke-KidLearnApi -Uri "${apiUrl}?action=admin_create_staff" -Method POST -Body @{
      role = "officer"
      username = "smoke_officer_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
      email = "smoke_officer@example.invalid"
      full_name = "Smoke Officer"
    } -Session $adminSession2 -CsrfToken $adminLogin2.csrf_token | Out-Null
    throw "admin_create_staff unexpectedly accepted missing password"
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 400) { throw }
  }
  Invoke-KidLearnApi -Uri "${apiUrl}?action=logout" -Method POST -Session $adminSession2 -CsrfToken $adminLogin2.csrf_token | Out-Null
}

Write-Host "Smoke test complete"
