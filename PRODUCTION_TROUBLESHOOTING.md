# Production Frontend Troubleshooting Guide

## 🔴 Current Issues

### Error 1: `ERR_NETWORK_CHANGED`
**Cause:** Network connection changed during page load

**Solution:**
1. Ensure stable internet connection
2. If on mobile/WiFi, avoid switching networks while app loads
3. The PWA service worker now caches Google APIs for offline resilience

### Error 2: `ERR_NAME_NOT_RESOLVED` for `apis.google.com`
**Cause:** Firebase cannot load Google OAuth APIs

**Solutions:**

#### A. Missing `.env` File (CRITICAL) ✅
**Status:** FIXED - `.env` file created from template

**Action Required:**
1. Open `client/.env`
2. Replace placeholder values with real Firebase credentials
3. Get credentials from [Firebase Console](https://console.firebase.google.com/)

```bash
# Navigate to client directory
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client

# Open .env file and update values
notepad .env
```

#### B. Network/DNS Issues
If DNS cannot resolve `apis.google.com`:

**Windows DNS Flush:**
```powershell
ipconfig /flushdns
```

**Try Google DNS:**
1. Open Network Settings
2. Change DNS to:
   - Primary: `8.8.8.8`
   - Secondary: `8.8.4.4`

#### C. Firewall/Corporate Network
If on corporate network:
- Check if `*.google.com` and `*.googleapis.com` are blocked
- Contact IT to whitelist Firebase domains:
  - `apis.google.com`
  - `*.googleapis.com`
  - `*.firebaseapp.com`
  - `*.cloudfunctions.net`

---

## 🔧 Changes Made

### 1. Created `.env` File
- Copied from `.env.example`
- **You must update with real Firebase credentials**

### 2. Enhanced PWA Caching (`vite.config.ts`)
Added caching for external APIs:
- `apis.google.com` - 7 day cache
- `*.googleapis.com` - 1 day cache
- Handles network changes gracefully

### 3. Added Firebase Validation (`firebase.config.ts`)
- Validates environment variables on startup
- Shows clear error if Firebase config is missing
- Prevents silent failures

---

## 📋 Production Deployment Checklist

### Pre-Deployment
- [ ] Update `.env` with production Firebase credentials
- [ ] Set `VITE_API_BASE_URL` to production backend URL
- [ ] Test Firebase authentication locally
- [ ] Verify MQTT broker connection

### Build & Deploy
```powershell
# Navigate to client
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client

# Install dependencies
npm install

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Post-Deployment
- [ ] Test on different networks (WiFi, Mobile, Ethernet)
- [ ] Verify PWA installation works
- [ ] Check browser console for errors
- [ ] Test offline functionality
- [ ] Verify authentication flows

---

## 🚀 Quick Fix Commands

### Rebuild Application
```powershell
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client
npm run build
```

### Clear Cache & Rebuild
```powershell
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client
Remove-Item -Recurse -Force node_modules, dist
npm install
npm run build
```

### Test Production Build Locally
```powershell
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client
npm run preview
# Opens at http://localhost:4173
```

---

## 🔍 Debugging Tools

### Check Environment Variables
```powershell
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client
Get-Content .env
```

### Check Build Output
```powershell
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\client
Get-ChildItem dist -Recurse
```

### Test DNS Resolution
```powershell
nslookup apis.google.com
ping apis.google.com
```

---

## 📱 Firebase Setup Guide

### 1. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** ⚙️
4. Scroll to **Your apps** section
5. Click **Web app** (</> icon)

### 2. Copy Configuration
Copy these values to your `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy... (from Firebase)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### 3. Enable Authentication
1. Go to **Authentication** > **Sign-in method**
2. Enable **Google** provider
3. Add authorized domain: `your-production-domain.com`
4. Add OAuth 2.0 configuration for SMU domain restriction

---

## ⚠️ Common Pitfalls

### 1. Environment Variables Not Loaded
- Vite requires `VITE_` prefix for client-side vars
- Must restart dev server after `.env` changes
- Must rebuild for production after `.env` changes

### 2. Firebase Domain Restrictions
- Check if Google Sign-In restricts to `smu.edu.ph`
- Ensure production domain is authorized in Firebase Console
- Verify OAuth redirect URIs are configured

### 3. Network Changes During Load
- PWA service worker now caches Google APIs
- App should recover gracefully from network changes
- If persistent, try hard refresh: `Ctrl + Shift + R`

---

## 📞 Support

### Logs to Check
1. **Browser Console:** `F12` > Console tab
2. **Network Tab:** `F12` > Network tab (check failed requests)
3. **Application Tab:** `F12` > Application > Service Workers

### Information to Provide
- Browser version
- Operating system
- Network type (WiFi/Ethernet/Mobile)
- Complete error message from console
- Steps to reproduce

---

## ✅ Verification Steps

After fixing `.env` and rebuilding:

1. **Clear browser cache:** `Ctrl + Shift + Delete`
2. **Hard refresh:** `Ctrl + Shift + R`
3. **Check console:** Should see no Firebase errors
4. **Test login:** Google Sign-In should open popup
5. **Check Network tab:** `apis.google.com` should load (200 status)

---

## 🎯 Expected Behavior

When properly configured:
- ✅ No errors in console on page load
- ✅ Firebase initializes successfully
- ✅ Google Sign-In button is clickable
- ✅ OAuth popup opens when clicking login
- ✅ App works offline after first load (PWA)
- ✅ Network changes don't crash the app

---

**Last Updated:** December 3, 2025
**Status:** `.env` created - awaiting Firebase credential configuration
