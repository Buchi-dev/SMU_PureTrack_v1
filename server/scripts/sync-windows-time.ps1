# ============================================
# Windows Time Synchronization Script
# ============================================
# This script helps fix "Invalid JWT Signature" errors
# caused by system time drift
#
# Run as Administrator for best results
# Usage: .\sync-windows-time.ps1
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Windows Time Synchronization Utility" -ForegroundColor Cyan
Write-Host "  Fix Firebase JWT Signature Errors" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some operations may fail without elevated privileges" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Display current time
Write-Host "📅 Current System Time:" -ForegroundColor Green
Write-Host "   Local:  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')" -ForegroundColor White
Write-Host "   UTC:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss' -AsUTC) UTC" -ForegroundColor White
Write-Host ""

# Check Windows Time service status
Write-Host "🔍 Checking Windows Time Service..." -ForegroundColor Green
$w32timeService = Get-Service -Name w32time -ErrorAction SilentlyContinue

if ($w32timeService) {
    Write-Host "   Status: $($w32timeService.Status)" -ForegroundColor White
    
    if ($w32timeService.Status -ne 'Running') {
        Write-Host "   ⚠️  Windows Time service is not running!" -ForegroundColor Yellow
        
        if ($isAdmin) {
            Write-Host "   Starting Windows Time service..." -ForegroundColor Cyan
            Start-Service w32time
            Write-Host "   ✓ Service started" -ForegroundColor Green
        } else {
            Write-Host "   Please run as Administrator to start the service" -ForegroundColor Red
        }
    } else {
        Write-Host "   ✓ Service is running" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Windows Time service not found" -ForegroundColor Red
}
Write-Host ""

# Check time synchronization configuration
Write-Host "🔍 Checking Time Sync Configuration..." -ForegroundColor Green
try {
    $timeConfig = w32tm /query /configuration | Out-String
    
    if ($timeConfig -match "Type:\s*(\w+)") {
        $syncType = $Matches[1]
        Write-Host "   Sync Type: $syncType" -ForegroundColor White
    }
    
    if ($timeConfig -match "NtpServer:\s*([^\s]+)") {
        $ntpServer = $Matches[1]
        Write-Host "   NTP Server: $ntpServer" -ForegroundColor White
    }
    
    Write-Host "   ✓ Configuration retrieved" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not retrieve configuration" -ForegroundColor Yellow
}
Write-Host ""

# Perform time synchronization
Write-Host "⏱️  Synchronizing time with internet time server..." -ForegroundColor Green

if ($isAdmin) {
    try {
        # Stop time service temporarily
        Stop-Service w32time -ErrorAction SilentlyContinue
        
        # Unregister and re-register time service
        w32tm /unregister | Out-Null
        w32tm /register | Out-Null
        
        # Start the service
        Start-Service w32time
        
        # Configure NTP server (use time.windows.com)
        w32tm /config /manualpeerlist:"time.windows.com,0x8 time.google.com,0x8" /syncfromflags:manual /reliable:YES /update | Out-Null
        
        # Force immediate synchronization
        $syncResult = w32tm /resync /rediscover 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Time synchronized successfully!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Sync command completed with warnings" -ForegroundColor Yellow
        }
        
        # Wait a moment for sync to complete
        Start-Sleep -Seconds 2
        
        # Check the sync status
        $status = w32tm /query /status 2>&1 | Out-String
        
        if ($status -match "Last Successful Sync Time:\s*(.+)") {
            Write-Host "   Last Successful Sync: $($Matches[1])" -ForegroundColor White
        }
        
        if ($status -match "Source:\s*(.+)") {
            Write-Host "   Time Source: $($Matches[1])" -ForegroundColor White
        }
        
    } catch {
        Write-Host "   ✗ Synchronization failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  Administrator privileges required for full synchronization" -ForegroundColor Yellow
    Write-Host "   Attempting user-level sync..." -ForegroundColor Cyan
    
    try {
        w32tm /resync 2>&1 | Out-Null
        Write-Host "   ✓ User-level sync completed" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ Sync failed. Please run as Administrator" -ForegroundColor Red
    }
}
Write-Host ""

# Display updated time
Write-Host "📅 Updated System Time:" -ForegroundColor Green
Write-Host "   Local:  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')" -ForegroundColor White
Write-Host "   UTC:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss' -AsUTC) UTC" -ForegroundColor White
Write-Host ""

# Docker considerations
Write-Host "🐳 Docker Considerations:" -ForegroundColor Green
Write-Host "   If running in Docker containers, you may also need to:" -ForegroundColor White
Write-Host "   1. Restart Docker Desktop (Windows)" -ForegroundColor White
Write-Host "   2. Restart Docker service: Restart-Service docker" -ForegroundColor White
Write-Host "   3. Restart your containers after time sync" -ForegroundColor White
Write-Host ""

# Summary and next steps
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Summary & Next Steps" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Time synchronization complete" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps to fix Firebase errors:" -ForegroundColor White
Write-Host "  1. Restart your Node.js server" -ForegroundColor White
Write-Host "  2. Run validation: node scripts/validate-firebase-key.js" -ForegroundColor White
Write-Host "  3. If still failing, generate a new Firebase service account key" -ForegroundColor White
Write-Host "  4. Check Firebase Console for key status" -ForegroundColor White
Write-Host ""
Write-Host "Validation Script Location:" -ForegroundColor Cyan
Write-Host "  server/scripts/validate-firebase-key.js" -ForegroundColor White
Write-Host ""

# Wait for user input before closing
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
