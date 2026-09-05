# Locust PRODUCTION - 1000 concurrent users (staged ramp, use carefully)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Prod1000 = Join-Path $Root "config\prod-1000.env"
$Example = Join-Path $Root "config\prod-1000.env.example"
if (-not (Test-Path $Prod1000)) {
  Copy-Item $Example $Prod1000
  Write-Host "Created config\prod-1000.env - set LOCUST_EMAIL + LOCUST_PASSWORD, then re-run." -ForegroundColor Yellow
  exit 1
}

$env:LOCUST_ENV_FILE = $Prod1000
Get-Content $Prod1000 | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}

if (-not $env:LOCUST_EMAIL -or -not $env:LOCUST_PASSWORD) {
  Write-Host "Set LOCUST_EMAIL and LOCUST_PASSWORD in config\prod-1000.env" -ForegroundColor Red
  exit 1
}

$env:LOCUST_SHARED_LOGIN = "true"
$env:LOCUST_SHAPE = "thousand"

New-Item -ItemType Directory -Force -Path (Join-Path $Root "reports") | Out-Null

Write-Host ""
Write-Host "=== PRODUCTION 1000-user load test ===" -ForegroundColor Magenta
Write-Host "Host : $($env:LOCUST_HOST)"
Write-Host "WARNING: This will stress production. Confirm off-peak / approval." -ForegroundColor Yellow
Write-Host "Shape: 100 -> 500 -> 1000 -> hold -> ramp down (~8 min)"
Write-Host ""

$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
  Write-Host "Cancelled."
  exit 0
}

python -m locust -f locustfile.py --host $env:LOCUST_HOST `
  --headless `
  --html (Join-Path $Root "reports\prod-1000-report.html") `
  --csv (Join-Path $Root "reports\prod-1000")

Write-Host ""
Write-Host "Report: reports\prod-1000-report.html" -ForegroundColor Green
