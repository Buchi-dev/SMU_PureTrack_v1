# Quick Email Alert Test
# Run this after deploying functions manually

$projectId = "my-app-da530"
$baseUrl = "https://us-central1-$projectId.cloudfunctions.net"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Quick Email Alert Test" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check preferences
Write-Host "1. Checking notification preferences..." -ForegroundColor Yellow
try {
    $prefs = Invoke-RestMethod -Uri "$baseUrl/listNotificationPreferences" -Method GET
    Write-Host "   Found $($prefs.count) preference(s)" -ForegroundColor Green
    
    if ($prefs.count -eq 0) {
        Write-Host "   WARNING: THIS IS WHY EMAILS AREN'T SENT!" -ForegroundColor Red
        Write-Host "   No notification preferences exist." -ForegroundColor Red
    } else {
        $prefs.data | ForEach-Object {
            Write-Host "   - $($_.email) (ID: $($_.userId))" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure functions are deployed!" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Create a test preference
$email = Read-Host "Enter your email address to test"

Write-Host ""
Write-Host "2. Creating notification preference..." -ForegroundColor Yellow

$body = @{
    userId = "test-user-001"
    email = $email
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/setupNotificationPreferences" -Method POST -ContentType "application/json" -Body $body
    Write-Host "   Preference created for $email" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Send test alert
Write-Host "3. Sending test alert email..." -ForegroundColor Yellow

$testBody = @{
    parameter = "ph"
    severity = "Critical"
    userEmail = $email
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/testAlertNotification" -Method POST -ContentType "application/json" -Body $testBody
    Write-Host "   Test alert sent!" -ForegroundColor Green
    Write-Host "   Alert ID: $($result.alertId)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Check your inbox at: $email" -ForegroundColor Cyan
    Write-Host "   (Also check spam/junk folder)" -ForegroundColor Yellow
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
