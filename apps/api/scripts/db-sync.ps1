# Sync PostgreSQL schema for CampusOne (pilot / dev).
# Tries migrations first; falls back to db push if migrate history is broken.
param(
  [string]$DatabaseUrl,
  [switch]$PushOnly
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiRoot = Split-Path -Parent $scriptDir
Push-Location $apiRoot

try {
  if (-not $DatabaseUrl) {
    $DatabaseUrl = $env:DATABASE_URL
  }
  if (-not $DatabaseUrl) {
    Write-Error "Set DATABASE_URL in apps/api/.env or pass -DatabaseUrl"
  }
  $env:DATABASE_URL = $DatabaseUrl

  Write-Host "Generating Prisma client..." -ForegroundColor Cyan
  npm run prisma:generate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($PushOnly) {
    Write-Host "Applying schema with db push..." -ForegroundColor Cyan
    npm run prisma:push
    exit $LASTEXITCODE
  }

  Write-Host "Applying migrations (deploy)..." -ForegroundColor Cyan
  npm run prisma:migrate:deploy
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Database sync completed (migrations)." -ForegroundColor Green
    exit 0
  }

  Write-Warning "migrate deploy failed (often a stale _prisma_migrations row)."
  Write-Host "Falling back to prisma db push — safe for local/pilot DBs..." -ForegroundColor Yellow
  npm run prisma:push
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Schema applied via db push." -ForegroundColor Green
  Write-Host "Tip: for a clean migration history on a new server, use an empty database and run migrate deploy only." -ForegroundColor Yellow
}
finally {
  Pop-Location
}
