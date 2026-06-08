# KAVACH Deploy Script
# Run after: vercel login + railway login

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

Write-Host "KAVACH Deploy Script" -ForegroundColor Cyan

if (-not $BackendOnly) {
    Write-Host "`n[1/2] Deploying frontend to Vercel..." -ForegroundColor Yellow
    Set-Location frontend

    # Set env vars
    $env:NEXT_PUBLIC_MAPBOX_TOKEN = (Get-Content ..\.env | Select-String "NEXT_PUBLIC_MAPBOX_TOKEN").Line.Split("=")[1]
    $env:NEXT_PUBLIC_SUPABASE_URL = (Get-Content ..\.env | Select-String "NEXT_PUBLIC_SUPABASE_URL").Line.Split("=")[1]
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = (Get-Content ..\.env | Select-String "NEXT_PUBLIC_SUPABASE_ANON_KEY").Line.Split("=")[1]

    vercel --prod --yes
    Set-Location ..
    Write-Host "Frontend deployed!" -ForegroundColor Green
}

if (-not $FrontendOnly) {
    Write-Host "`n[2/2] Deploying backend to Railway..." -ForegroundColor Yellow
    Set-Location backend
    railway up
    Set-Location ..
    Write-Host "Backend deployed!" -ForegroundColor Green
}

Write-Host "`nDeploy complete. Check blockers.md for post-deploy steps." -ForegroundColor Cyan
