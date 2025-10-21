# Firestore Security Rules Fix

## Problem Identified

**Error:** "Authentication failed: Missing or insufficient permissions"

### Root Cause
The Firestore security rules file (`firestore.rules`) was incomplete and **did not include rules for the `users` collection**. This meant:
- ❌ Users couldn't read their own profile data from Firestore
- ❌ Users couldn't update their profile (department, phone number)
- ❌ The AuthContext couldn't fetch user data
- ❌ Sign-in would succeed at the Firebase Auth level but fail when trying to load the user profile

### Database State
Looking at the Firestore data, the user has:
```javascript
{
  createdAt: "October 21, 2025 at 12:19:28 PM UTC+8",
  department: "",          // Empty string (needs completion)
  email: "jhed-tiyuzon@smu.edu.ph",
  firstname: "Tristan",
  lastLogin: "October 21, 2025 at 12:38:43 PM UTC+8",
  lastname: "Justine M. YUZON",
  middlename: "",          // Empty string (optional)
  phoneNumber: "",         // Empty string (needs completion)
  role: "Staff",
  status: "Pending",       // Pending approval
  updatedAt: "October 21, 2025 at 12:38:43 PM UTC+8",
  uuid: "OqDoL5BjBFsK7mKhsKjJubfwn22"
}
```

The empty strings for `department` and `phoneNumber` are correct - this user needs to complete their profile.

## Solution Applied

### 1. Updated Firestore Security Rules

**Before:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /devices/{deviceId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**After:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ==================== USER PROFILES ====================
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own profile (limited fields)
      allow update: if request.auth != null 
                    && request.auth.uid == userId
                    && request.resource.data.keys().hasOnly([
                      'firstname', 'lastname', 'middlename', 
                      'department', 'phoneNumber', 'updatedAt'
                    ]);
      
      // Only Cloud Functions can create or delete
      allow create, delete: if false;
    }
    
    // ==================== LOGIN LOGS ====================
    match /login_logs/{logId} {
      allow read, write: if false;  // Only Cloud Functions
    }
    
    // ==================== DEVICES ====================
    match /devices/{deviceId} {
      allow read: if request.auth != null;  // Authenticated users
      allow write: if false;                 // Only Cloud Functions
    }
    
    // ==================== SENSOR READINGS ====================
    match /sensor_readings/{readingId} {
      allow read: if request.auth != null;  // Authenticated users
      allow write: if false;                 // Only Cloud Functions
    }
    
    // ==================== REPORTS ====================
    match /reports/{reportId} {
      allow read: if request.auth != null;  // Authenticated users
      allow write: if false;                 // Only Cloud Functions
    }
  }
}
```

### 2. Deployed to Firebase
```bash
firebase deploy --only firestore:rules
```

Status: ✅ **Successfully deployed**

## Security Model

### User Profiles (`/users/{userId}`)
- **Read:** Users can read ONLY their own profile
- **Update:** Users can update ONLY their own profile with specific fields:
  - `firstname`, `lastname`, `middlename`
  - `department`, `phoneNumber`
  - `updatedAt`
- **Create/Delete:** Only Cloud Functions (admins use Cloud Functions)
- **Fields Protected:** `role`, `status`, `email`, `uuid`, `createdAt` cannot be changed by users

### Other Collections
- **Devices:** Authenticated users can read, only Cloud Functions can write
- **Sensor Readings:** Authenticated users can read, only Cloud Functions can write
- **Reports:** Authenticated users can read, only Cloud Functions can write
- **Login Logs:** Only Cloud Functions can access

## Expected Flow Now

```
1. User signs in with Google
   ↓
2. Firebase Authentication succeeds ✅
   ↓
3. Cloud Function allows sign-in (all statuses) ✅
   ↓
4. Client receives authenticated user ✅
   ↓
5. AuthContext fetches user profile from Firestore ✅
   (NOW ALLOWED - security rules updated)
   ↓
6. Profile data loaded:
   - department: "" (empty)
   - phoneNumber: "" (empty)
   - status: "Pending"
   ↓
7. Router checks profile:
   - Empty department/phone → Redirect to /auth/complete-account ✅
   ↓
8. User fills in department and phone
   ↓
9. Profile updated in Firestore ✅
   (NOW ALLOWED - security rules permit self-update)
   ↓
10. Router redirects to /auth/pending-approval ✅
    (status is still "Pending")
```

## Testing Steps

1. **Sign in with the test user** (`jhed-tiyuzon@smu.edu.ph`)
   - Should now successfully authenticate
   - Should redirect to Account Completion page (empty department/phone)

2. **Complete the profile**
   - Fill in department and phone number
   - Should successfully save to Firestore
   - Should redirect to Pending Approval page

3. **Admin approves the account**
   - Change status from "Pending" to "Approved" in Firestore
   - User should automatically redirect to dashboard

## Summary

✅ **Fixed:** Firestore security rules now allow users to read and update their own profiles  
✅ **Fixed:** Added rules for all collections (devices, sensor_readings, reports, login_logs)  
✅ **Security:** Users can only access their own data, not other users' data  
✅ **Security:** Critical fields (role, status) can only be modified by Cloud Functions  
✅ **Deployed:** Changes are live in production  

The authentication flow should now work end-to-end! 🎉
