param([switch]$PhoneOnly)

$envFile = "$PSScriptRoot\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: $envFile not found" -ForegroundColor Red
    exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $vars[$matches[1].Trim()] = $matches[2].Trim().Trim('"').Trim("'")
    }
}

if ($PhoneOnly) {
    $keys = @("DEMO_PHONE_NUMBER")
} else {
    $keys = @(
        "DEMO_PHONE_NUMBER",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "NASA_API_KEY",
        "NOAA_KP_URL",
        "KAVACH_AUDIO_URL"
    )
}

Write-Host "Syncing to Railway..." -ForegroundColor Cyan

foreach ($key in $keys) {
    if ($vars.ContainsKey($key) -and $vars[$key] -ne "") {
        $val = $vars[$key]
        Write-Host "  Setting $key" -ForegroundColor Yellow
        railway variables set "$key=$val" 2>&1 | Out-Null
        Write-Host "  OK $key updated" -ForegroundColor Green
    }
}

Write-Host "Done. Railway restarts automatically in a few seconds." -ForegroundColor Green
