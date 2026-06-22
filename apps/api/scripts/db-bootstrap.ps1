param(
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  $DatabaseUrl = $env:DATABASE_URL
}

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL is not set. Pass -DatabaseUrl or set DATABASE_URL in your environment."
}

$env:DATABASE_URL = $DatabaseUrl

Write-Host "Using DATABASE_URL for bootstrap..." -ForegroundColor Cyan
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$PSScriptRoot\db-sync.ps1" -DatabaseUrl $DatabaseUrl
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Database bootstrap completed." -ForegroundColor Green
Write-Host "Note: demo users are auto-seeded when the API starts." -ForegroundColor Yellow
