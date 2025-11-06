# Firestore Permission Error Fix Guide

## 🔴 Problem
You're getting a "Missing or insufficient permissions" error when trying to access the users list in the Admin User Management page.

**Error Location:** `userManagement.Service.ts:168`

**Root Cause:** The Firestore security rules require that users have the `role: 'Admin'` custom claim in their authentication token to read all users. Your token may not have this claim set, or it needs to be refreshed.

---

## 🔍 Why This Happens

### Firestore Security Rules
Your `firestore.rules` file has this rule for reading users:

```javascript
match /users/{userId} {
  allow read: if isAuthenticated() && (
    isOwner(userId) || isAdmin()
  );
}

function isAdmin() {
  return isAuthenticated() && request.auth.token.role == 'Admin';
}
```

This means:
- ✅ Users can read their **own** profile
- ✅ Users with `role: 'Admin'` in their token can read **all** users
- ❌ Staff users cannot read other users' profiles

### Custom Claims Flow
1. When you sign in, the `beforeSignIn` blocking function sets custom claims
2. These claims include `role` and `status` from your Firestore user document
3. The token is cached and doesn't automatically update when your role changes in Firestore

---

## ✅ Solutions

### Solution 1: Refresh Your Token (Recommended)

I've added a **"Refresh Token"** button to your Admin User Management page. 

**Steps:**
1. Open the Admin User Management page
2. Look for the "Refresh Token" button in the toolbar
3. Click it to refresh your authentication token
4. Check the browser console for auth debug information
5. The page will reload if you have Admin access

**What it does:**
- Forces a fresh ID token from Firebase
- Verifies your admin status
- Shows detailed error messages if you don't have Admin role
- Logs authentication details to the console for debugging

### Solution 2: Sign Out and Sign Back In

**Steps:**
1. Click the sign-out button
2. Sign in again with your credentials
3. The `beforeSignIn` function will automatically set fresh custom claims

**Why this works:** 
- A fresh sign-in always retrieves the latest role from Firestore
- Sets new custom claims in your token

### Solution 3: Verify Your Role in Firestore

**Check if you actually have Admin role:**
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `users` collection
4. Find your user document (by email)
5. Check the `role` field - it should be `"Admin"`

**If your role is NOT "Admin":**
- You need another admin to promote you, OR
- Use Firebase Console to manually update your user document

---

## 🛠️ What I've Added

### 1. Enhanced Error Handling
The subscription error handler now:
- Detects permission errors
- Attempts automatic token refresh
- Provides detailed error messages
- Suggests next steps

### 2. Token Refresh Button
A new button that:
- Manually refreshes your authentication token
- Verifies admin status
- Logs debug information to console
- Shows user-friendly messages

### 3. Auth Debug Logging
The component now automatically logs authentication details when it loads:
```javascript
// Check console for:
🔐 Auth Debug Info
  - User ID
  - Email
  - Token Claims (including role)
  - Role in Token
  - Status in Token
  - Token timestamps
```

---

## 🧪 Testing & Debugging

### Check Your Token Claims
Open the browser console and run:
```javascript
// Check if you're admin
const { refreshAndVerifyAdmin } = await import('./utils/authHelpers');
const result = await refreshAndVerifyAdmin();
console.log(result);
```

### Check Your Profile
```javascript
// Check your Firestore profile
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './config/firebase';

const docRef = doc(db, 'users', auth.currentUser.uid);
const docSnap = await getDoc(docRef);
console.log('Your profile:', docSnap.data());
```

---

## 📋 Quick Checklist

- [ ] **Step 1:** Check browser console for auth debug info
- [ ] **Step 2:** Click "Refresh Token" button
- [ ] **Step 3:** Verify your role is "Admin" in the response
- [ ] **Step 4:** If role is NOT "Admin", check Firestore database
- [ ] **Step 5:** If role IS "Admin" but still failing, sign out and back in
- [ ] **Step 6:** If still failing, check Firebase Console for errors

---

## 🎯 Expected Behavior After Fix

Once your token has the correct Admin claims:
- ✅ No more "insufficient permissions" errors
- ✅ Real-time updates of user list
- ✅ Ability to approve/suspend users
- ✅ Ability to view all user details

---

## 🔧 Alternative: Temporarily Adjust Security Rules (Not Recommended for Production)

If you need immediate access for development/testing, you can temporarily relax the rules:

**⚠️ WARNING: This makes your database less secure. Only use for development.**

Edit `firestore.rules`:
```javascript
match /users/{userId} {
  // TEMPORARY: Allow all authenticated users to read all users
  allow read: if isAuthenticated();
  
  // ... rest of the rules
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

**Remember to revert this change before production!**

---

## 📞 Still Having Issues?

If you're still experiencing problems:

1. **Check Firebase Console** for function logs
2. **Check Network tab** in browser DevTools for failed requests
3. **Check Firestore rules** are deployed: `firebase deploy --only firestore:rules`
4. **Verify user document** exists and has correct role
5. **Check custom claims** in Firebase Auth console (Authentication > Users > click user > Custom claims)

---

## 📝 Related Files

- `client/src/services/userManagement.Service.ts` - Service layer for user operations
- `client/src/pages/admin/AdminUserManagement/AdminUserManagement.tsx` - Admin UI (updated with token refresh)
- `client/src/utils/authHelpers.ts` - Token management utilities
- `firestore.rules` - Security rules
- `functions/lib/auth/beforeSignIn.js` - Sets custom claims on sign-in

---

## 🎓 Understanding Custom Claims

Custom claims are set when you sign in and cached in your token. They don't automatically update when your Firestore data changes.

**When do custom claims update?**
- ✅ When you sign in
- ✅ When you manually refresh the token
- ✅ When the token expires (after 1 hour)
- ❌ NOT when Firestore data changes

This is why you need to refresh your token after role changes!
