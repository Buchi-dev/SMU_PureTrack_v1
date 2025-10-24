# ✅ EMAIL ALERT SYSTEM - TESTED & WORKING

## Test Results (October 23, 2025)

### ✅ **TEST SUCCESSFUL!**

Three test emails were successfully sent to: **hed-tjyuzon@smu.edu.ph**

1. **[Critical]** pH Level Alert
2. **[Warning]** TDS Alert  
3. **[Advisory]** Turbidity Alert

---

## 🔍 Root Cause Analysis

### ❌ Why Emails Weren't Being Sent Before:

1. **Alerts were created successfully** in Firestore ✅
2. **System checked `notificationPreferences` collection** to find recipients
3. **Collection was EMPTY** - No users configured ❌
4. **Result: NO emails were sent** ❌

### The Missing Link:

```
Alert Created → Check notificationPreferences → [EMPTY] → NO EMAILS SENT ❌
```

After fix:

```
Alert Created → Check notificationPreferences → [Found Users] → EMAILS SENT ✅
```

---

## ✅ Solution Implemented

Created notification preference for your email:
- **User ID**: admin-hed-tjyuzon
- **Email**: hed-tjyuzon@smu.edu.ph
- **Notifications**: Enabled for ALL severities (Advisory, Warning, Critical)
- **Parameters**: ALL (pH, TDS, Turbidity)
- **Devices**: ALL devices

---

## 📧 Email Format

Recipients receive beautifully formatted HTML emails with:
- Severity-colored header (Red/Yellow/Blue)
- Device name and location
- Current value vs threshold
- Recommended action
- Timestamp

---

## 🚀 Deployed Cloud Functions

| Function | URL |
|----------|-----|
| **testAlertNotification** | https://us-central1-my-app-da530.cloudfunctions.net/testAlertNotification |
| **setupNotificationPreferences** | https://us-central1-my-app-da530.cloudfunctions.net/setupNotificationPreferences |
| **listNotificationPreferences** | https://us-central1-my-app-da530.cloudfunctions.net/listNotificationPreferences |

---

## 📝 Next Steps for Production

### 1. Get All User IDs from Firestore

Go to Firestore → `users` collection → Copy document IDs (UUIDs) for all admins and staff

### 2. Edit the Setup Script

Open `setup-all-notifications.ps1` and add your users:

```powershell
$users = @(
    @{ userId = "USER_UUID_HERE"; email = "admin@smu.edu.ph"; role = "Admin" }
    @{ userId = "USER_UUID_HERE"; email = "staff1@smu.edu.ph"; role = "Staff" }
    @{ userId = "USER_UUID_HERE"; email = "staff2@smu.edu.ph"; role = "Staff" }
    # Add all your users here...
)
```

### 3. Run the Setup Script

```powershell
.\setup-all-notifications.ps1
```

### 4. Verify

```powershell
Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/listNotificationPreferences"
```

---

## 🧪 Testing Commands

### Check Current Preferences
```powershell
Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/listNotificationPreferences"
```

### Add New User
```powershell
$body = @{
    userId = "USER_ID_HERE"
    email = "user@smu.edu.ph"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/setupNotificationPreferences" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Send Test Alert
```powershell
$body = @{
    severity = "Critical"
    parameter = "ph"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/testAlertNotification" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 🎯 How It Works Now

### When Sensor Reading Exceeds Threshold:

1. **Alert Created** in Firestore `alerts` collection
2. **System queries** `notificationPreferences` collection
3. **Finds all users** with `emailNotifications: true`
4. **Filters by**:
   - Severity (does user want Critical/Warning/Advisory?)
   - Parameters (does user want pH/TDS/Turbidity alerts?)
   - Devices (is user monitoring this device?)
   - Quiet Hours (is it currently quiet hours?)
5. **Sends email** to each matching user
6. **Updates alert** with list of notified users

### Email Notification Filters:

Users receive emails only if:
- ✅ `emailNotifications: true`
- ✅ Alert severity is in their `alertSeverities` array
- ✅ Alert parameter is in their `parameters` array (or empty = all)
- ✅ Alert device is in their `devices` array (or empty = all)
- ✅ Current time is NOT in quiet hours

---

## 📊 Firestore Structure

### Collection: `notificationPreferences`

Each document:
```json
{
  "userId": "admin-hed-tjyuzon",
  "email": "hed-tjyuzon@smu.edu.ph",
  "emailNotifications": true,
  "pushNotifications": false,
  "alertSeverities": ["Advisory", "Warning", "Critical"],
  "parameters": [],  // Empty = all parameters
  "devices": [],     // Empty = all devices
  "quietHoursEnabled": false,
  "quietHoursStart": null,
  "quietHoursEnd": null
}
```

---

## 🔧 Troubleshooting

### Emails Not Arriving?

1. **Check spam/junk folder** ✉️
2. **Verify email address** in notification preferences
3. **Check Firebase logs**: `firebase functions:log`
4. **Verify Gmail credentials** in `functions/src/index.ts` (lines 67-69)
5. **Test with direct email** (bypasses preferences):
   ```powershell
   $body = @{
       userEmail = "your-email@smu.edu.ph"
       severity = "Critical"
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/testAlertNotification" `
       -Method POST -ContentType "application/json" -Body $body
   ```

### Check System Status
```powershell
# View all preferences
Invoke-RestMethod -Uri "https://us-central1-my-app-da530.cloudfunctions.net/listNotificationPreferences"

# Check Firebase logs
firebase functions:log --only testAlertNotification,processSensorData
```

---

## 📚 Files Created

1. **`quick-test.ps1`** - Fast testing script
2. **`test-email-alerts.ps1`** - Comprehensive interactive test
3. **`setup-all-notifications.ps1`** - Batch setup for all users
4. **`test-commands.txt`** - cURL commands reference
5. **`EMAIL_ALERT_TROUBLESHOOTING.md`** - Full documentation
6. **`CURL_TEST_COMMANDS.md`** - cURL examples
7. **`TEST_RESULTS.md`** (this file) - Test results and summary

---

## ✅ Confirmed Working

- ✅ Alert creation in Firestore
- ✅ Notification preference storage
- ✅ Email notification system
- ✅ Gmail SMTP integration
- ✅ HTML email formatting
- ✅ Multiple severity levels
- ✅ All water quality parameters (pH, TDS, Turbidity)
- ✅ Cloud Functions deployment
- ✅ Test endpoints working

---

## 🎉 Success!

The email alert system is now **fully functional and tested**. 

**Action Required**: Set up notification preferences for all admin and staff users using `setup-all-notifications.ps1`

---

**Tested By**: System Administrator  
**Date**: October 23, 2025  
**Email**: hed-tjyuzon@smu.edu.ph  
**Status**: ✅ WORKING
