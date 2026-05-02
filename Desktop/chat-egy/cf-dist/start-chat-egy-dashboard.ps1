$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dashboardUrl = "http://127.0.0.1:8877/dashboard/"

try {
  $existing = Invoke-WebRequest -UseBasicParsing $dashboardUrl -TimeoutSec 2
  if ($existing.StatusCode -eq 200) {
    Write-Host "Dashboard is already running:"
    Write-Host $dashboardUrl
    exit 0
  }
} catch {
}

$php = (Get-Command php -ErrorAction Stop).Source
Start-Process -FilePath $php -ArgumentList "-S", "127.0.0.1:8877" -WorkingDirectory $projectRoot -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
  $response = Invoke-WebRequest -UseBasicParsing $dashboardUrl -TimeoutSec 5
  if ($response.StatusCode -eq 200) {
    Write-Host "Dashboard started successfully:"
    Write-Host $dashboardUrl
    exit 0
  }
} catch {
}

Write-Error "Failed to start dashboard server on $dashboardUrl"
