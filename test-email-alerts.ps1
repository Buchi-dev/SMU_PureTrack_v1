# =====================================================
# Email Alert Testing Script for PureTrack
# =====================================================
# This script helps you test the email alert system
# =====================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PureTrack Email Alert Testing Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Get Firebase project ID
Write-Host "Getting Firebase project information..." -ForegroundColor Yellow
$projectInfo = firebase use
$projectId = "capstone-iot-ac203"  # Your project ID

Write-Host "Using project: $projectId" -ForegroundColor Green
Write-Host ""

# Base URL for Cloud Functions
$baseUrl = "https://us-central1-$projectId.cloudfunctions.net"

Write-Host "Cloud Functions Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host ""

# =====================================================
# STEP 1: List existing notification preferences
# =====================================================
Write-Host "STEP 1: Checking existing notification preferences..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/listNotificationPreferences" -Method GET -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✓ Found $($response.count) notification preference(s)" -ForegroundColor Green
        
        if ($response.count -gt 0) {
            Write-Host ""
            Write-Host "Existing Preferences:" -ForegroundColor Cyan
            $response.data | ForEach-Object {
                Write-Host "  - User: $($_.userId)" -ForegroundColor White
                Write-Host "    Email: $($_.email)" -ForegroundColor White
                Write-Host "    Notifications: $($_.emailNotifications)" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host "⚠ No notification preferences found!" -ForegroundColor Red
            Write-Host "  This is why admins/staff aren't receiving emails." -ForegroundColor Red
        }
    }
} catch {
    Write-Host "✗ Error checking preferences: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# =====================================================
# STEP 2: Create notification preferences
# =====================================================
Write-Host "STEP 2: Setting up notification preferences..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------" -ForegroundColor Yellow

# Prompt for user details
$setupPrefs = Read-Host "Do you want to set up notification preferences for a user? (y/n)"

if ($setupPrefs -eq "y") {
    Write-Host ""
    $userId = Read-Host "Enter User ID (e.g., admin-001 or staff-001)"
    $userEmail = Read-Host "Enter Email Address"
    
    $prefsBody = @{
        userId = $userId
        email = $userEmail
    } | ConvertTo-Json
    
    Write-Host ""
    Write-Host "Creating notification preferences..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/setupNotificationPreferences" `
            -Method POST `
            -ContentType "application/json" `
            -Body $prefsBody
        
        if ($response.success) {
            Write-Host "✓ Notification preferences created successfully!" -ForegroundColor Green
            Write-Host "  User: $userId" -ForegroundColor White
            Write-Host "  Email: $userEmail" -ForegroundColor White
            Write-Host "  Will receive: All severities (Advisory, Warning, Critical)" -ForegroundColor White
            Write-Host "  For: All devices and all parameters" -ForegroundColor White
        } else {
            Write-Host "✗ Failed to create preferences: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ""

# =====================================================
# STEP 3: Send test alert
# =====================================================
Write-Host "STEP 3: Sending test alert email..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------" -ForegroundColor Yellow

$sendTest = Read-Host "Do you want to send a test alert email? (y/n)"

if ($sendTest -eq "y") {
    Write-Host ""
    Write-Host "Select severity level:" -ForegroundColor Cyan
    Write-Host "  1. Advisory" -ForegroundColor White
    Write-Host "  2. Warning" -ForegroundColor Yellow
    Write-Host "  3. Critical" -ForegroundColor Red
    $severityChoice = Read-Host "Enter choice (1-3)"
    
    $severity = switch ($severityChoice) {
        "1" { "Advisory" }
        "2" { "Warning" }
        "3" { "Critical" }
        default { "Warning" }
    }
    
    Write-Host ""
    Write-Host "Select parameter:" -ForegroundColor Cyan
    Write-Host "  1. pH" -ForegroundColor White
    Write-Host "  2. TDS" -ForegroundColor White
    Write-Host "  3. Turbidity" -ForegroundColor White
    $paramChoice = Read-Host "Enter choice (1-3)"
    
    $parameter = switch ($paramChoice) {
        "1" { "ph" }
        "2" { "tds" }
        "3" { "turbidity" }
        default { "ph" }
    }
    
    Write-Host ""
    $directEmail = Read-Host "Enter email to send test alert to (or press Enter to use notification preferences)"
    
    $testBody = @{
        deviceId = "TEST-DEVICE-001"
        parameter = $parameter
        severity = $severity
    }
    
    if ($directEmail -ne "") {
        $testBody.userEmail = $directEmail
    }
    
    $testBodyJson = $testBody | ConvertTo-Json
    
    Write-Host ""
    Write-Host "Sending test alert..." -ForegroundColor Yellow
    Write-Host "  Severity: $severity" -ForegroundColor White
    Write-Host "  Parameter: $parameter" -ForegroundColor White
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/testAlertNotification" `
            -Method POST `
            -ContentType "application/json" `
            -Body $testBodyJson
        
        if ($response.success) {
            Write-Host ""
            Write-Host "✓ Test alert sent successfully!" -ForegroundColor Green
            Write-Host "  Alert ID: $($response.alertId)" -ForegroundColor White
            Write-Host "  Notifications sent: $($response.notificationsSent)" -ForegroundColor White
            
            if ($response.recipients) {
                Write-Host ""
                Write-Host "Recipients:" -ForegroundColor Cyan
                $response.recipients | ForEach-Object {
                    Write-Host "  - $($_.email) (User: $($_.userId))" -ForegroundColor White
                }
            }
            
            if ($response.recipient) {
                Write-Host "  Direct email sent to: $($response.recipient)" -ForegroundColor White
            }
            
            Write-Host ""
            Write-Host "✓ Check the inbox(es) for the test alert email!" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to send test alert" -ForegroundColor Red
            Write-Host "  Message: $($response.message)" -ForegroundColor Yellow
            
            if ($response.hint) {
                Write-Host "  Hint: $($response.hint)" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "✗ Error sending test alert: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary of Email Alert System:" -ForegroundColor Yellow
Write-Host "  1. Alerts are created automatically when sensor readings exceed thresholds" -ForegroundColor White
Write-Host "  2. Emails are only sent to users with notification preferences set up" -ForegroundColor White
Write-Host "  3. Preferences must have emailNotifications = true" -ForegroundColor White
Write-Host "  4. Users can filter by severity, parameters, and devices" -ForegroundColor White
Write-Host ""
Write-Host "If staff/admins aren't receiving emails, check:" -ForegroundColor Yellow
Write-Host "  ✓ Notification preferences exist for their userId" -ForegroundColor White
Write-Host "  ✓ emailNotifications is set to true" -ForegroundColor White
Write-Host "  ✓ alertSeverities includes the alert level" -ForegroundColor White
Write-Host "  ✓ Not in quiet hours" -ForegroundColor White
Write-Host "  ✓ Email address is correct" -ForegroundColor White
Write-Host ""
