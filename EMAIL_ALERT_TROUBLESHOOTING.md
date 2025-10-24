# 📧 Email Alert System Troubleshooting Guide

## ⚠️ **WHY ADMINS AND STAFF AREN'T RECEIVING EMAIL ALERTS**

### The Root Cause
**The notification preferences are not set up in Firestore!**

When an alert is created, the system:
1. ✅ Creates alert in Firestore `alerts` collection
2. ❌ Looks for users in `notificationPreferences` collection
3. ❌ Finds ZERO users (collection is empty)
4. ❌ Sends NO emails

### The Solution
You must create notification preferences for each user who should receive alerts.

---

## 🔧 How to Fix

### Method 1: Deploy and Run PowerShell Script (Recommended)

1. **Deploy the new functions:**
   ```powershell
   cd C:\Users\Administrator\Desktop\Capstone-Final-Final
   firebase deploy --only functions
   ```

2. **Run the test script:**
   ```powershell
   .\quick-test.ps1
   ```

3. **Or use the comprehensive script:**
   ```powershell
   .\test-email-alerts.ps1
   ```

### Method 2: Manual cURL Commands

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

#### Step 1: Check existing preferences
```bash
curl -X GET "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/listNotificationPreferences"
```

**If you see `"count": 0` - that's why no emails are sent!**

#### Step 2: Create notification preferences for Admin
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"ADMIN_UUID\", \"email\": \"admin@smu.edu.ph\"}"
```

#### Step 3: Create notification preferences for Staff
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"STAFF_UUID\", \"email\": \"staff@smu.edu.ph\"}"
```

#### Step 4: Send test alert
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"parameter\": \"ph\", \"severity\": \"Critical\", \"userEmail\": \"your-email@smu.edu.ph\"}"
```

---

## 📋 Required Firestore Structure

### Collection: `notificationPreferences`

Each document represents one user's notification settings:

```json
{
  "userId": "admin-uuid-here",
  "email": "admin@smu.edu.ph",
  "emailNotifications": true,
  "pushNotifications": false,
  "alertSeverities": ["Advisory", "Warning", "Critical"],
  "parameters": [],  // Empty = all parameters (pH, TDS, turbidity)
  "devices": [],     // Empty = all devices
  "quietHoursEnabled": false,
  "quietHoursStart": null,
  "quietHoursEnd": null
}
```

### How to Get User UUIDs

1. **From Firebase Console:**
   - Go to Firestore Database
   - Open `users` collection
   - Copy the document ID (this is the UUID)

2. **From your app:**
   - When user logs in, their UID is available
   - Store it when creating notification preferences

---

## 🧪 Testing Email Alerts

### New Cloud Functions Added

I've added three new test functions:

1. **`testAlertNotification`**
   - Sends a test alert email
   - Can send to specific email or use notification preferences
   - Creates alert in Firestore

2. **`setupNotificationPreferences`**
   - Creates notification preferences for a user
   - Sets up default settings (all alerts, all devices)

3. **`listNotificationPreferences`**
   - Shows all users configured to receive alerts
   - Use this to verify setup

### Test Scenarios

#### Scenario 1: Direct Email Test
Sends email directly without checking preferences:
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"userEmail\": \"test@smu.edu.ph\"}"
```

#### Scenario 2: Using Notification Preferences
Sends to all users who have preferences set up:
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"severity\": \"Critical\"}"
```

---

## 🔍 Debugging Checklist

When alerts aren't sending emails, check:

- [ ] **Notification preferences exist**
  ```bash
  curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/listNotificationPreferences
  ```
  Should return count > 0

- [ ] **Email address is correct**
  - Check the email field in notification preferences
  - Verify it matches user's actual email

- [ ] **emailNotifications is true**
  ```json
  "emailNotifications": true
  ```

- [ ] **Severity is included**
  ```json
  "alertSeverities": ["Advisory", "Warning", "Critical"]
  ```

- [ ] **Not in quiet hours**
  - Check `quietHoursEnabled` setting
  - Verify current time is not in quiet hours range

- [ ] **Gmail credentials are valid**
  - Check `functions/src/index.ts` lines 67-69
  - Verify EMAIL_USER and EMAIL_PASSWORD are correct

- [ ] **Check spam folder**
  - Test emails might go to spam initially

---

## 📊 How the Alert System Works

### Current Flow (Why It's Not Working)

```
Sensor Reading → Threshold Exceeded → Alert Created → Check notificationPreferences
                                                              ↓
                                                         Empty Collection!
                                                              ↓
                                                         No emails sent ❌
```

### Fixed Flow (After Setup)

```
Sensor Reading → Threshold Exceeded → Alert Created → Check notificationPreferences
                                                              ↓
                                                         Found 5 users
                                                              ↓
                                                    Filter by severity/params/devices
                                                              ↓
                                                         Send emails to 3 users ✅
```

---

## 🚀 Quick Start for Production

### Step 1: Deploy Functions
```powershell
firebase deploy --only functions
```

### Step 2: Create Preferences for All Staff/Admin

Get all user IDs from Firestore `users` collection where `role` is "Staff" or "Admin", then create preferences:

```bash
# For each user, run:
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/setupNotificationPreferences" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"USER_UUID_HERE\", \"email\": \"USER_EMAIL_HERE\"}"
```

### Step 3: Verify Setup
```bash
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/listNotificationPreferences
```

Should show all users configured.

### Step 4: Test Real Alert
```bash
curl -X POST "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/testAlertNotification" \
  -H "Content-Type: application/json" \
  -d "{\"severity\": \"Critical\", \"parameter\": \"ph\"}"
```

Check if all configured users received the email.

---

## 🎯 Next Steps

1. **Immediate:**
   - Run `.\quick-test.ps1` to verify email system works
   - Create notification preferences for yourself

2. **Before Production:**
   - Create notification preferences for all admins
   - Create notification preferences for all staff
   - Test with different severity levels
   - Verify spam filtering

3. **Optional Enhancements:**
   - Add UI in admin panel to manage notification preferences
   - Allow users to configure their own preferences
   - Add SMS notifications
   - Implement notification frequency limits

---

## 📞 Support

If emails still aren't working after following this guide:

1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Look for errors in:
   - `processSensorData` function
   - `processNotifications` function
   - `sendEmailNotification` function

3. Verify Gmail app password is valid:
   - Login to hed-tjyuzon@smu.edu.ph
   - Check Google Account → Security → App Passwords
   - Generate new one if needed
   - Update in `functions/src/index.ts`

---

## 📝 Summary

**Problem:** Alerts are created but no emails are sent to staff/admins

**Root Cause:** `notificationPreferences` collection in Firestore is empty

**Solution:** Create notification preferences for each user using the new `setupNotificationPreferences` function

**Verification:** Use `testAlertNotification` to send test emails and verify the system works

**Tools Provided:**
- `quick-test.ps1` - Fast PowerShell test
- `test-email-alerts.ps1` - Comprehensive testing script
- `CURL_TEST_COMMANDS.md` - cURL reference guide
- Three new Cloud Functions for testing and setup
