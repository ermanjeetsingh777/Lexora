# Locust local - Lexora API
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$LocalEnv = Join-Path $Root "config\local.env"
$env:LOCUST_ENV_FILE = $LocalEnv
if (Test-Path $LocalEnv) {
  Get-Content $LocalEnv | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $k, $v = $_ -split '=', 2
    if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
  }
}

Write-Host "Locust LOCAL -> $($env:LOCUST_HOST)" -ForegroundColor Cyan
Write-Host "Web UI: http://localhost:8089" -ForegroundColor Green

python -m locust -f locustfile.py --host $env:LOCUST_HOST
