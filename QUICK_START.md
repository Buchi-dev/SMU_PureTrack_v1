# 🚀 Quick Start Guide - Authentication Flow

## Prerequisites
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created
- Google OAuth configured in Firebase Console

---

## ⚡ Quick Setup (5 minutes)

### 1️⃣ Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:beforeCreate,functions:beforeSignIn
```

**Expected Output:**
```
✔  functions[us-central1-beforeCreate]
✔  functions[us-central1-beforeSignIn]
✔  Deploy complete!
```

---

### 2️⃣ Setup Client

```bash
cd ../client
npm install
cp .env.example .env
```

**Edit `.env` file:**
```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Get values from:** Firebase Console → Project Settings → General → Your apps

---

### 3️⃣ Configure Firebase Console

1. **Enable Google Sign-in:**
   - Go to Authentication → Sign-in method
   - Click "Google" → Enable
   - Click Save

2. **Add Authorized Domain:**
   - Still in Sign-in method tab
   - Scroll to "Authorized domains"
   - Add `localhost` (for development)
   - Add your production domain

3. **Verify Blocking Functions:**
   - Go to Authentication → Settings
   - Scroll to "Blocking functions"
   - You should see:
     - ✅ `beforeCreate`
     - ✅ `beforeSignIn`

---

### 4️⃣ Add Routes to Your App

Edit `client/src/router/index.tsx`:

```typescript
import GoogleAuth from "../pages/auth/GoogleAuth";
import AccountCompletion from "../pages/auth/AccountCompletion";
import PendingApproval from "../pages/auth/PendingApproval";
import AccountInactive from "../pages/auth/AccountInactive";

// Add to your routes array:
const routes = [
  {
    path: "/auth/login",
    element: <GoogleAuth />,
  },
  {
    path: "/auth/complete-account",
    element: <AccountCompletion />,
  },
  {
    path: "/auth/pending-approval",
    element: <PendingApproval />,
  },
  {
    path: "/auth/account-inactive",
    element: <AccountInactive />,
  },
  // ... your other routes
];
```

---

### 5️⃣ Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:5173/auth/login`

---

## 🧪 Testing the Flow

### Test 1: New User Registration

1. Navigate to `/auth/login`
2. Click "Sign in with Google"
3. **Expected:** Redirected to `/auth/complete-account`
4. Fill in department & phone
5. **Expected:** Redirected to `/auth/pending-approval`

**✅ Check Firestore:**
```
users/{uid}
  - status: "Pending"
  - role: "Staff"
  - department: "Your input"
  - phoneNumber: "Your input"
```

---

### Test 2: Approve User

1. Go to Firebase Console → Firestore
2. Find your user in `users` collection
3. Edit document: Change `status` to `"Approved"`
4. **Expected:** Pending approval page auto-redirects to dashboard

---

### Test 3: Sign In as Approved User

1. Sign out
2. Sign in again with same Google account
3. **Expected:** Direct access to dashboard
4. No profile completion screen

**✅ Check Firestore:**
```
login_logs (new document)
  - result: "success"
  - statusAttempted: "Approved"
  
users/{uid}
  - lastLogin: (timestamp updated)
```

---

## 🔍 Monitoring & Debugging

### View Cloud Function Logs
```bash
firebase functions:log --only beforeCreate,beforeSignIn
```

### View Login Attempts
Firebase Console → Firestore → `login_logs` collection

### View User Profiles
Firebase Console → Firestore → `users` collection

### Common Issues & Solutions

**Issue:** Functions not triggering
```bash
# Re-deploy functions
firebase deploy --only functions --force
```

**Issue:** Client can't connect
- Verify `.env` values match Firebase Console
- Check authorized domains include your domain

**Issue:** User stuck on pending
- Check Firestore: `users/{uid}/status` must be exactly `"Approved"` (case-sensitive)

---

## 📊 Expected Collections in Firestore

After testing, you should see:

### `users` Collection
```
users/
  ├─ {userId1}/
  │   ├─ uuid: "..."
  │   ├─ email: "user@example.com"
  │   ├─ status: "Approved"
  │   ├─ role: "Staff"
  │   └─ ...
  └─ {userId2}/
      └─ ...
```

### `login_logs` Collection
```
login_logs/
  ├─ {logId1}/
  │   ├─ uid: "..."
  │   ├─ result: "success"
  │   ├─ statusAttempted: "Approved"
  │   └─ timestamp: ...
  └─ {logId2}/
      └─ ...
```

### `business_logs` Collection
```
business_logs/
  ├─ {logId1}/
  │   ├─ action: "user_created"
  │   ├─ uid: "..."
  │   └─ timestamp: ...
  └─ ...
```

---

## 🎯 What's Next?

1. **Build Admin Panel** for managing users
2. **Add Email Notifications** when users are approved
3. **Implement Firestore Security Rules** (see implementation guide)
4. **Add Role-Based Access Control** to routes

---

## 📚 Full Documentation

- **Complete Guide:** `AUTHENTICATION_IMPLEMENTATION_GUIDE.md`
- **Summary:** `AUTHENTICATION_SUMMARY.md`
- **This Guide:** `QUICK_START.md`

---

## ✅ Quick Checklist

Before going to production:

- [ ] Cloud Functions deployed
- [ ] Google Sign-in enabled
- [ ] Environment variables configured
- [ ] Routes added to router
- [ ] Authorized domains configured
- [ ] Firestore Security Rules deployed
- [ ] Admin approval process established
- [ ] Monitoring/logging configured
- [ ] Error handling tested
- [ ] Production domain added

---

## 🆘 Need Help?

1. Check the logs: `firebase functions:log`
2. Review Firestore data
3. Verify environment variables
4. Check authorized domains
5. Review `AUTHENTICATION_IMPLEMENTATION_GUIDE.md`

---

**Time to Complete:** ~5 minutes  
**Difficulty:** Easy  
**Status:** Ready to Deploy
