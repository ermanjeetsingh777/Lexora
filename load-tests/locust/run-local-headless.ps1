# Locust LOCAL - headless (CI / quick run)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:LOCUST_ENV_FILE = Join-Path $Root "config\local.env"
Get-Content $env:LOCUST_ENV_FILE | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}

$Users = if ($env:LOCUST_USERS) { $env:LOCUST_USERS } else { "20" }
$Rate = if ($env:LOCUST_SPAWN_RATE) { $env:LOCUST_SPAWN_RATE } else { "5" }
$Time = if ($env:LOCUST_RUN_TIME) { $env:LOCUST_RUN_TIME } else { "2m" }

Write-Host "Headless LOCAL $($env:LOCUST_HOST) users=$Users rate=$Rate time=$Time" -ForegroundColor Cyan

python -m locust -f locustfile.py --host $env:LOCUST_HOST `
  --headless -u $Users -r $Rate -t $Time `
  --html (Join-Path $Root "reports\local-report.html") `
  --csv (Join-Path $Root "reports\local")
