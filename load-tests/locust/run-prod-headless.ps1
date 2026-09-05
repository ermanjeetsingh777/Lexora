# Locust PRODUCTION - headless (conservative)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$ProdEnv = Join-Path $Root "config\prod.env"
if (-not (Test-Path $ProdEnv)) {
  Copy-Item (Join-Path $Root "config\prod.env.example") $ProdEnv
  Write-Host "Created config\prod.env - fill credentials and re-run." -ForegroundColor Yellow
  exit 1
}

$env:LOCUST_ENV_FILE = $ProdEnv
Get-Content $ProdEnv | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_ -split '=', 2
  if ($k -and $null -ne $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
}

if (-not $env:LOCUST_EMAIL -or -not $env:LOCUST_PASSWORD) {
  Write-Host "Set LOCUST_EMAIL / LOCUST_PASSWORD in config\prod.env" -ForegroundColor Red
  exit 1
}

$Users = if ($env:LOCUST_USERS) { $env:LOCUST_USERS } else { "10" }
$Rate = if ($env:LOCUST_SPAWN_RATE) { $env:LOCUST_SPAWN_RATE } else { "2" }
$Time = if ($env:LOCUST_RUN_TIME) { $env:LOCUST_RUN_TIME } else { "1m" }

New-Item -ItemType Directory -Force -Path (Join-Path $Root "reports") | Out-Null
Write-Host "Headless PROD $($env:LOCUST_HOST) users=$Users rate=$Rate time=$Time" -ForegroundColor Magenta

python -m locust -f locustfile.py --host $env:LOCUST_HOST `
  --headless -u $Users -r $Rate -t $Time `
  --html (Join-Path $Root "reports\prod-report.html") `
  --csv (Join-Path $Root "reports\prod")
