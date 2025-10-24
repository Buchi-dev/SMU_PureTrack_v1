# Setup Notification Preferences for All Admin and Staff
# Run this script to configure email alerts for all users

$baseUrl = "https://us-central1-my-app-da530.cloudfunctions.net"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Notification Preferences Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Example users - Replace these with actual user IDs and emails from Firestore
$users = @(
    @{ userId = "admin-hed-tjyuzon"; email = "hed-tjyuzon@smu.edu.ph"; role = "Admin" }
    # Add more users here:
    # @{ userId = "staff-001"; email = "staff1@smu.edu.ph"; role = "Staff" }
    # @{ userId = "staff-002"; email = "staff2@smu.edu.ph"; role = "Staff" }
    # @{ userId = "admin-002"; email = "admin2@smu.edu.ph"; role = "Admin" }
)

Write-Host "Setting up notification preferences for $($users.Count) user(s)..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($user in $users) {
    Write-Host "Processing: $($user.email) ($($user.role))..." -ForegroundColor Cyan
    
    $body = @{
        userId = $user.userId
        email = $user.email
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/setupNotificationPreferences" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body
        
        if ($result.success) {
            Write-Host "  ✓ Success" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ Failed: $($result.error)" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✓ Success: $successCount" -ForegroundColor Green
Write-Host "  ✗ Failed: $failCount" -ForegroundColor Red
Write-Host ""

# Verify setup
Write-Host "Verifying notification preferences..." -ForegroundColor Yellow
try {
    $prefs = Invoke-RestMethod -Uri "$baseUrl/listNotificationPreferences" -Method GET
    Write-Host "Total preferences configured: $($prefs.count)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configured users:" -ForegroundColor Cyan
    $prefs.data | ForEach-Object {
        Write-Host "  - $($_.email) (ID: $($_.userId))" -ForegroundColor White
    }
} catch {
    Write-Host "Error verifying: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Add more users to the script" -ForegroundColor White
Write-Host "  2. Get user IDs from Firestore users collection" -ForegroundColor White
Write-Host "  3. Run this script again to add them" -ForegroundColor White
Write-Host "  4. Test alerts will be sent to all configured users" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
