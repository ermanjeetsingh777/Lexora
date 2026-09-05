# Locust LOCAL - 1000 concurrent users (staged ramp)
# Question: 1000 users ek saath backend hit karein to system kaisa perform karega?
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

New-Item -ItemType Directory -Force -Path (Join-Path $Root "reports") | Out-Null

$env:LOCUST_ENV_FILE = Join-Path $Root "config\local-1000.env"
Get-Content $env:LOCUST_ENV_FILE | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}

$env:LOCUST_SHARED_LOGIN = "true"
$env:LOCUST_SHAPE = "thousand"

Write-Host ""
Write-Host "=== LOCAL 1000-user load test ===" -ForegroundColor Cyan
Write-Host "Host : $($env:LOCUST_HOST)"
Write-Host "Shape: 100 -> 500 -> 1000 users (hold ~4 min) -> ramp down"
Write-Host "Shared login: ON (1 token for all VUs - avoids 1000 login storms)"
Write-Host "Ensure API is running first."
Write-Host ""

# With LoadTestShape, -u/-r are ignored; shape controls concurrency
python -m locust -f locustfile.py --host $env:LOCUST_HOST `
  --headless `
  --html (Join-Path $Root "reports\local-1000-report.html") `
  --csv (Join-Path $Root "reports\local-1000")

Write-Host ""
Write-Host "Report: reports\local-1000-report.html" -ForegroundColor Green
