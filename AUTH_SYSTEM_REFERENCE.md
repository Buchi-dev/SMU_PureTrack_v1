# Complete Authentication System - Reference Guide

## System Architecture

### Components
1. **Firebase Authentication** - Google OAuth
2. **Cloud Functions** - `beforeCreate`, `beforeSignIn`
3. **Firestore Database** - User profiles, login logs
4. **Firestore Security Rules** - Access control
5. **Client-Side Routing** - Status-based redirects
6. **Auth Context** - Global authentication state

---

## Complete Authentication Flow

### New User Registration

```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth authentication
   ↓
3. Cloud Function: beforeCreate
   - Creates user profile in Firestore
   - Sets: role="Staff", status="Pending"
   - Sets: department="", phoneNumber=""
   - Logs to business_logs
   ↓
4. Cloud Function: beforeSignIn
   - Logs sign-in attempt
   - Updates lastLogin timestamp
   - Allows sign-in ✅
   ↓
5. Client: AuthContext loads profile
   - Firestore rules allow reading own profile ✅
   ↓
6. Router: RootRedirect checks
   - Profile incomplete (empty department/phone)
   - Redirects to: /auth/complete-account
   ↓
7. User completes profile
   - Fills department and phone number
   - Firestore rules allow updating own profile ✅
   - Updates Firestore
   ↓
8. Router: Redirects to /auth/pending-approval
   - Status is still "Pending"
   - User waits for admin approval
```

### Returning User (Pending Status)

```
1. User signs in
   ↓
2. Cloud Function: beforeSignIn
   - Allows sign-in (status: "Pending") ✅
   ↓
3. AuthContext loads profile
   - department: filled ✅
   - phoneNumber: filled ✅
   - status: "Pending"
   ↓
4. Router: Redirects to /auth/pending-approval
   - Shows waiting screen
   - Real-time listener for status changes
```

### Returning User (Suspended Status)

```
1. User signs in
   ↓
2. Cloud Function: beforeSignIn
   - Allows sign-in (status: "Suspended") ✅
   ↓
3. AuthContext loads profile
   - status: "Suspended"
   ↓
4. Router: Redirects to /auth/account-inactive
   - Shows suspension notice
   - Contact admin option
```

### Approved User

```
1. User signs in
   ↓
2. Cloud Function: beforeSignIn
   - Allows sign-in (status: "Approved") ✅
   ↓
3. AuthContext loads profile
   - status: "Approved"
   - role: "Admin" or "Staff"
   ↓
4. Router: Redirects to dashboard
   - Admin → /admin/dashboard
   - Staff → /staff/dashboard
```

---

## Firestore Security Rules Summary

### Users Collection
```javascript
/users/{userId}
  ✅ Read: Own profile only
  ✅ Update: Own profile (limited fields)
  ❌ Create/Delete: Cloud Functions only
  
  Updatable fields:
  - firstname, lastname, middlename
  - department, phoneNumber
  - updatedAt
  
  Protected fields:
  - role, status (Admin only via Cloud Functions)
  - email, uuid, createdAt (immutable)
```

### Other Collections
```javascript
/devices/{deviceId}
  ✅ Read: Authenticated users
  ❌ Write: Cloud Functions only

/sensor_readings/{readingId}
  ✅ Read: Authenticated users
  ❌ Write: Cloud Functions only

/reports/{reportId}
  ✅ Read: Authenticated users
  ❌ Write: Cloud Functions only

/login_logs/{logId}
  ❌ Read/Write: Cloud Functions only
```

---

## User Profile Structure

```typescript
interface UserProfile {
  uuid: string;              // Firebase UID (immutable)
  firstname: string;         // From Google displayName
  lastname: string;          // From Google displayName
  middlename: string;        // User input (optional)
  department: string;        // User input (required)
  phoneNumber: string;       // User input (required)
  email: string;             // From Google (immutable)
  role: "Staff" | "Admin";   // Cloud Function only
  status: "Pending" | "Approved" | "Suspended";  // Cloud Function only
  createdAt: Timestamp;      // Server timestamp
  updatedAt?: Timestamp;     // Server timestamp
  lastLogin?: Timestamp;     // Updated on each sign-in
}
```

---

## Status-Based Routing

### Route Protection
```typescript
// Public routes (not authenticated)
/auth/login                 → GoogleAuth page

// Status-based routes (authenticated)
/auth/complete-account      → Missing department/phone
/auth/pending-approval      → status = "Pending"
/auth/account-inactive      → status = "Suspended"

// Protected routes (authenticated + approved)
/admin/*                    → status = "Approved" + role = "Admin"
/staff/*                    → status = "Approved" + role = "Staff"
```

### Automatic Redirects
```typescript
RootRedirect logic:
1. Not authenticated → /auth/login
2. Incomplete profile → /auth/complete-account
3. Status = Suspended → /auth/account-inactive
4. Status = Pending → /auth/pending-approval
5. Status = Approved + Admin → /admin/dashboard
6. Status = Approved + Staff → /staff/dashboard
```

---

## Admin Actions (via Firestore Console or Admin Panel)

### Approve User
```javascript
// Change status in Firestore
users/{userId}
  status: "Pending" → "Approved"

// User automatically redirected to dashboard
```

### Suspend User
```javascript
// Change status in Firestore
users/{userId}
  status: "Approved" → "Suspended"

// User automatically redirected to account-inactive page
```

### Promote to Admin
```javascript
// Change role in Firestore
users/{userId}
  role: "Staff" → "Admin"

// User gets admin privileges on next sign-in
```

---

## Troubleshooting

### Error: "Missing or insufficient permissions"
- **Cause:** Firestore security rules blocking access
- **Solution:** Deploy updated rules: `firebase deploy --only firestore:rules`
- **Status:** ✅ Fixed

### Error: "Your account is pending approval"
- **Cause:** Cloud Function blocking sign-in for Pending users
- **Solution:** Allow sign-in, let client handle routing
- **Status:** ✅ Fixed

### User stuck on loading screen
- **Check:** AuthContext error in console
- **Check:** Firestore rules allow reading user profile
- **Check:** User document exists in Firestore

### Profile not updating
- **Check:** Firestore rules allow updating allowed fields
- **Check:** Not trying to update protected fields (role, status)
- **Check:** User is authenticated

---

## Deployment Commands

### Deploy Everything
```bash
firebase deploy
```

### Deploy Specific Components
```bash
# Cloud Functions only
firebase deploy --only functions

# Firestore rules only
firebase deploy --only firestore:rules

# Firestore indexes only
firebase deploy --only firestore:indexes
```

---

## Security Best Practices

✅ **Implemented:**
- Users can only access their own data
- Critical fields protected from user modification
- Cloud Functions have full access for admin operations
- All sign-in attempts logged
- Real-time status updates with Firestore listeners

⚠️ **Future Enhancements:**
- Email notifications for approval/suspension
- Rate limiting for sign-in attempts
- Admin panel for user management (UI)
- Audit logs for admin actions
- Two-factor authentication (optional)

---

## Quick Reference

| User State | Can Sign In? | Redirects To |
|------------|-------------|--------------|
| New User | ✅ | /auth/complete-account |
| Incomplete Profile | ✅ | /auth/complete-account |
| Pending Approval | ✅ | /auth/pending-approval |
| Suspended | ✅ | /auth/account-inactive |
| Approved (Staff) | ✅ | /staff/dashboard |
| Approved (Admin) | ✅ | /admin/dashboard |

---

## Contact & Support

For issues or questions:
1. Check Firestore console for user status
2. Check browser console for errors
3. Check Firebase Functions logs
4. Verify Firestore security rules are deployed
