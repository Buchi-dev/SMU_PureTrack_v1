# Authentication Flow - Strict Domain Validation Test Plan

## Overview
This document outlines the test plan to verify that personal accounts (non-@smu.edu.ph) cannot access the system at any point in the authentication flow.

## Test Environment Setup

### Prerequisites
1. **Two Google accounts**:
   - Personal account (e.g., `yourname@gmail.com`)
   - SMU account (e.g., `yourname@smu.edu.ph`)
2. **Browser**: Chrome/Edge with DevTools open
3. **Server**: Running in development mode with logs visible
4. **Client**: Running in development mode

### Start Testing

```powershell
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client  
cd client
npm run dev
```

## Test Cases

### ✅ Test Case 1: Personal Account Login Attempt

**Steps**:
1. Open `http://localhost:5173` (or your dev URL)
2. Click "Sign in with Google"
3. Select a **personal Gmail account** (not @smu.edu.ph)
4. Complete Google OAuth

**Expected Results**:
- ❌ User should NOT reach account completion page
- ❌ User should NOT reach pending approval page
- ❌ User should NOT see any dashboard
- ✅ User should see error message: "Access denied: Only SMU email addresses (@smu.edu.ph) are allowed..."
- ✅ User should remain on login page
- ✅ User should be signed out from Firebase automatically

**Console Logs (Client)**:
```
[AuthService] Domain validation failed - personal account detected: user@gmail.com
[AuthContext] Domain validation failed - personal account detected: user@gmail.com
[AuthContext] Signing out unauthorized user immediately
[AuthLogin] Login failed: Access denied: Only SMU email addresses...
```

**Server Logs**:
```json
{
  "email": "user@gmail.com",
  "level": "warn",
  "message": "[Auth] Domain validation failed - personal account rejected",
  "requiredDomain": "@smu.edu.ph"
}
{
  "method": "POST",
  "path": "/verify-token",
  "statusCode": 403
}
```

**Network Tab**:
- Should see 403 response from `/api/v1/auth/verify-token`
- No other API calls should be made

---

### ✅ Test Case 2: SMU Account First-Time Login

**Steps**:
1. Clear browser data/use incognito mode
2. Open login page
3. Click "Sign in with Google"
4. Select an **SMU email account** (@smu.edu.ph)
5. Complete Google OAuth

**Expected Results**:
- ✅ User should successfully authenticate
- ✅ User should be redirected to **Account Completion** page
- ✅ Page should show fields for:
  - First Name (pre-filled)
  - Last Name (pre-filled)
  - Middle Name (optional, pre-filled if available)
  - Department (dropdown)
  - Phone Number (input)
- ✅ Can complete profile and proceed to **Pending Approval** page

**Console Logs (Client)**:
```
[AuthLogin] Login successful, user: {...}
[AuthContext] Firebase auth state changed: user@smu.edu.ph
[AuthContext] User authenticated, connecting to Socket.IO...
```

**Server Logs**:
```json
{
  "message": "[Auth] New user created",
  "userId": "...",
  "email": "user@smu.edu.ph"
}
{
  "method": "POST",
  "path": "/verify-token",
  "statusCode": 200
}
```

---

### ✅ Test Case 3: Direct URL Access (Personal Account)

**Steps**:
1. Login with personal account (should fail - see Test Case 1)
2. Try to manually navigate to:
   - `http://localhost:5173/auth/account-completion`
   - `http://localhost:5173/auth/pending-approval`
   - `http://localhost:5173/admin/dashboard`
   - `http://localhost:5173/staff/dashboard`

**Expected Results**:
- ✅ All routes should redirect to `/auth/login`
- ✅ No content should be visible from protected pages
- ✅ Protected route guards should block access

**Console Logs**:
```
[ProtectedRoute] Unauthorized access - personal account detected: user@gmail.com
[AccountCompletion] Unauthorized access attempt - personal account detected: user@gmail.com
```

---

### ✅ Test Case 4: Existing SMU User Login

**Steps**:
1. Use an SMU account that has already completed profile and been approved
2. Login via Google OAuth

**Expected Results**:
- ✅ User should be redirected to appropriate dashboard:
  - Admin: `/admin/dashboard`
  - Staff: `/staff/dashboard`
- ✅ No account completion or pending approval screens shown
- ✅ Socket.IO should connect successfully

---

### ✅ Test Case 5: Suspended Account Access

**Steps**:
1. Login with an SMU account that has been suspended by admin
2. Complete Google OAuth

**Expected Results**:
- ✅ User should be redirected to `/auth/account-suspended` page
- ✅ User cannot access any dashboards
- ✅ Clear message explaining suspension

---

### ✅ Test Case 6: Token Expiration with Personal Account

**Steps**:
1. Somehow get a personal account token into browser (advanced test)
2. Wait for token to expire
3. Try to make any authenticated request

**Expected Results**:
- ✅ Request should fail with 401 or 403
- ✅ Domain validation should still catch it in middleware
- ✅ User should be logged out

---

## Validation Checklist

After running all tests, verify:

### Client-Side
- [ ] No personal accounts can reach account completion
- [ ] No personal accounts can reach pending approval
- [ ] No personal accounts can reach any dashboard
- [ ] Error messages are clear and user-friendly
- [ ] No console errors (only warning logs for validation)
- [ ] Login page shows proper error alert

### Server-Side
- [ ] 403 responses logged for personal account attempts
- [ ] No users created in database for personal accounts
- [ ] Domain validation warnings in logs
- [ ] No Socket.IO connections from personal accounts
- [ ] Auth middleware blocks personal accounts

### Network
- [ ] `/auth/verify-token` returns 403 for personal accounts
- [ ] No subsequent API calls made after rejection
- [ ] Proper error response structure with `errorCode: 'AUTH_INVALID_DOMAIN'`

### Database
- [ ] Run query: `db.users.find({ email: { $not: /@smu\.edu\.ph$/ } })`
- [ ] Should return NO results (no personal accounts stored)

---

## Regression Tests

Ensure existing functionality still works:

### ✅ Existing SMU Users
- [ ] Can login successfully
- [ ] Can access their dashboards
- [ ] Can use all features normally
- [ ] Socket.IO connections work
- [ ] Real-time updates work

### ✅ New SMU Users
- [ ] Can complete account profile
- [ ] Can see pending approval page
- [ ] Admin can approve/reject them
- [ ] After approval, can access dashboards

### ✅ Admin Functions
- [ ] Can manage users
- [ ] Can suspend/activate accounts
- [ ] Can approve pending users
- [ ] Can access all admin features

---

## Performance Testing

Verify no performance regressions:

- [ ] Login time for SMU accounts (should be ~2-3 seconds)
- [ ] Domain validation adds <50ms overhead
- [ ] No memory leaks from failed auth attempts
- [ ] No hanging Firebase sessions

---

## Browser Console Commands for Testing

### Check Firebase Auth State
```javascript
import { auth } from './src/config/firebase.config';
console.log('Current User:', auth.currentUser);
console.log('Email:', auth.currentUser?.email);
```

### Check Local Storage
```javascript
// Should see Firebase auth keys
console.log(localStorage);
```

### Manual Domain Check
```javascript
const email = "test@gmail.com";
console.log('Valid:', email.endsWith('@smu.edu.ph')); // Should be false
```

---

## Known Behaviors (Expected)

These are NOT bugs:

1. **Personal account sees error on login page**
   - ✅ Expected - this is the correct behavior

2. **403 errors in server logs for personal accounts**
   - ✅ Expected - backend is rejecting unauthorized domains

3. **Multiple validation log messages**
   - ✅ Expected - defense in depth (multiple layers check)

4. **User signed out immediately after personal account login**
   - ✅ Expected - automatic cleanup of unauthorized sessions

---

## Troubleshooting

### If personal account still reaches account completion:

1. **Check browser cache**: Clear all site data
2. **Check Firebase console**: Ensure user was actually signed out
3. **Check AuthContext logs**: Look for domain validation messages
4. **Check network tab**: See if 403 response was received
5. **Verify code deployment**: Ensure latest changes are running

### If SMU accounts can't login:

1. **Check domain spelling**: Must be exactly `@smu.edu.ph`
2. **Check backend validation**: Review auth.Routes.js line 43
3. **Check Firebase config**: Ensure Firebase is configured correctly
4. **Check environment variables**: Verify API endpoints

---

## Success Criteria

All tests must pass with:
- ✅ 0 personal accounts reaching protected pages
- ✅ 0 personal accounts stored in database
- ✅ Clear error messages for users
- ✅ Proper logging for monitoring
- ✅ No impact on legitimate SMU users

---

**Test Date**: _______________
**Tester**: _______________
**Status**: [ ] PASSED  [ ] FAILED  [ ] IN PROGRESS
**Notes**:
