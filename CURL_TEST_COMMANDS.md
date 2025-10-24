# Email Alert Testing with cURL Commands

## Prerequisites
First, deploy the new functions:
```bash
cd functions
npm run build
firebase deploy --only functions:testAlertNotification,functions:setupNotificationPreferences,functions:listNotificationPreferences
```

Replace `YOUR_PROJECT_ID` with your Firebase project ID (likely `capstone-iot-ac203`)

---

## 🔍 STEP 1: Check Existing Notification Preferences

**This shows you why emails aren't being sent!**

```bash
curl -X GET "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/listNotificationPreferences"
```

**Expected Response if NO preferences exist:**
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

**This is the problem!** Without notification preferences, nobody receives emails.

---

## ✅ STEP 2: Create Notification Preferences

### For Admin User:
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"admin-001\", \"email\": \"admin@example.com\"}"
```

### For Staff User:
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"staff-001\", \"email\": \"staff@example.com\"}"
```

### Using Real User IDs from your database:
```bash
# Replace with actual UUID from Firestore users collection
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"ACTUAL_USER_UUID_HERE\", \"email\": \"their-email@smu.edu.ph\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification preferences created successfully",
  "data": {
    "userId": "admin-001",
    "email": "admin@example.com",
    "emailNotifications": true,
    "pushNotifications": false,
    "alertSeverities": ["Advisory", "Warning", "Critical"],
    "parameters": [],
    "devices": [],
    "quietHoursEnabled": false
  }
}
```

---

## 📧 STEP 3: Send Test Alert Email

### Option A: Send to specific email (bypasses preferences)
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\": \"TEST-001\", \"parameter\": \"ph\", \"severity\": \"Warning\", \"userEmail\": \"test@example.com\"}"
```

### Option B: Send to all users with notification preferences
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\": \"TEST-001\", \"parameter\": \"ph\", \"severity\": \"Critical\"}"
```

### Different Test Scenarios:

**Critical pH Alert:**
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"parameter\": \"ph\", \"severity\": \"Critical\"}"
```

**Warning TDS Alert:**
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"parameter\": \"tds\", \"severity\": \"Warning\"}"
```

**Advisory Turbidity Alert:**
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"parameter\": \"turbidity\", \"severity\": \"Advisory\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test alert sent to 2 recipient(s)",
  "alertId": "abc123xyz",
  "recipients": [
    {
      "email": "admin@example.com",
      "userId": "admin-001"
    },
    {
      "email": "staff@example.com",
      "userId": "staff-001"
    }
  ],
  "notificationsSent": 2
}
```

---

## 🔧 PowerShell Version (Windows)

### List Preferences:
```powershell
Invoke-RestMethod -Uri "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/listNotificationPreferences" -Method GET
```

### Setup Preference:
```powershell
$body = @{
    userId = "admin-001"
    email = "admin@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" -Method POST -ContentType "application/json" -Body $body
```

### Send Test Alert:
```powershell
$body = @{
    parameter = "ph"
    severity = "Critical"
    userEmail = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" -Method POST -ContentType "application/json" -Body $body
```

---

## 🐛 Troubleshooting

### Problem: "No notification preferences found"
**Solution:** Run STEP 2 to create notification preferences for your users

### Problem: Email not received
**Check:**
1. Spam/junk folder
2. Email address is correct in notification preferences
3. Gmail credentials are valid in functions/src/index.ts
4. Check Firebase Functions logs: `firebase functions:log`

### Problem: "User not found"
**Solution:** Make sure userId matches actual user UUID in Firestore `users` collection

### View Firebase Logs:
```bash
firebase functions:log --only testAlertNotification
```

---

## 📊 Why Emails Weren't Being Sent

The alert system works like this:

1. ✅ **Alert Created** - When sensor readings exceed thresholds, alerts are created in Firestore
2. ❌ **Notification Check** - System checks `notificationPreferences` collection
3. ❌ **No Preferences Found** - If collection is empty, NO emails are sent
4. ❌ **Staff/Admin Don't Receive Alerts**

**The Fix:**
- Create notification preferences for each user (STEP 2)
- Preferences specify:
  - Email address
  - Which severities to receive (Advisory/Warning/Critical)
  - Which parameters to monitor (pH/TDS/Turbidity)
  - Which devices to monitor
  - Quiet hours settings

---

## 🎯 Quick Start Guide

1. **Deploy new functions:**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

2. **Run the PowerShell test script:**
   ```powershell
   .\test-email-alerts.ps1
   ```

3. **Or manually with cURL:**
   ```bash
   # Check preferences
   curl -X GET "https://us-central1-capstone-iot-ac203.cloudfunctions.net/listNotificationPreferences"
   
   # Create preference (replace email)
   curl -X POST "https://us-central1-capstone-iot-ac203.cloudfunctions.net/setupNotificationPreferences" \
     -H "Content-Type: application/json" \
     -d "{\"userId\": \"admin-001\", \"email\": \"YOUR_EMAIL@smu.edu.ph\"}"
   
   # Send test alert
   curl -X POST "https://us-central1-capstone-iot-ac203.cloudfunctions.net/testAlertNotification" \
     -H "Content-Type: application/json" \
     -d "{\"severity\": \"Critical\", \"userEmail\": \"YOUR_EMAIL@smu.edu.ph\"}"
   ```

4. **Check your email!** 📬
