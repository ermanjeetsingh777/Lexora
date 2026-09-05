# Locust LOCAL 1000 - Web UI (manual start; shape still active)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:LOCUST_ENV_FILE = Join-Path $Root "config\local-1000.env"
Get-Content $env:LOCUST_ENV_FILE | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}
$env:LOCUST_SHARED_LOGIN = "true"
$env:LOCUST_SHAPE = "thousand"

Write-Host "LOCAL 1000-user Web UI -> http://localhost:8089" -ForegroundColor Cyan
Write-Host "Shape auto-ramps to 1000 - you can also Start with 1000 users / 50 spawn rate." -ForegroundColor Gray
python -m locust -f locustfile.py --host $env:LOCUST_HOST
