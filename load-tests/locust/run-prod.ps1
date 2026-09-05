# Locust PRODUCTION - Lexora API (conservative defaults)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$ProdEnv = Join-Path $Root "config\prod.env"
$Example = Join-Path $Root "config\prod.env.example"
if (-not (Test-Path $ProdEnv)) {
  Copy-Item $Example $ProdEnv
  Write-Host "Created config\prod.env - set LOCUST_EMAIL and LOCUST_PASSWORD, then re-run." -ForegroundColor Yellow
  exit 1
}

$env:LOCUST_ENV_FILE = $ProdEnv
Get-Content $ProdEnv | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}

if (-not $env:LOCUST_EMAIL -or -not $env:LOCUST_PASSWORD) {
  Write-Host "Set LOCUST_EMAIL and LOCUST_PASSWORD in config\prod.env" -ForegroundColor Red
  exit 1
}

Write-Host "Locust PROD -> $($env:LOCUST_HOST)" -ForegroundColor Magenta
Write-Host "WARNING: This hits production. Keep users/spawn rate low." -ForegroundColor Yellow
Write-Host "Web UI: http://localhost:8089" -ForegroundColor Green

python -m locust -f locustfile.py --host $env:LOCUST_HOST
