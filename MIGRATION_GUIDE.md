# 🔧 Security Fixes Migration Guide

**Project:** Water Quality Monitoring System  
**Date:** November 2, 2025  
**Priority:** CRITICAL - Must be completed before production deployment

---

## 📋 Overview

This guide provides step-by-step instructions to migrate from hardcoded credentials to secure secret management. These changes address **3 Critical (P0) security vulnerabilities** identified in the security audit.

**Changes Made:**
1. ✅ MQTT Bridge updated to require environment variables
2. ✅ Email configuration migrated to Firebase Secret Manager
3. ✅ Client Firebase config moved to environment variables
4. ✅ Realtime Database rules hardened to require authentication
5. ✅ Created `.env.example` files for all services

---

## ⚠️ BEFORE YOU BEGIN

### Prerequisites
- Firebase CLI installed and logged in: `firebase login`
- Google Cloud SDK installed (for Secret Manager)
- Access to Firebase Console (Admin/Owner role)
- Access to MQTT broker credentials
- Gmail app password for email notifications

### Backup
Before making any changes:
```bash
# Backup current deployment
firebase use --add  # Select your project
firebase deploy --only functions,database,firestore,hosting --dry-run

# Create a git branch for rollback
git checkout -b pre-security-migration
git push origin pre-security-migration
```

---

## 🔐 STEP 1: Rotate MQTT Credentials (CRITICAL)

**Why:** Current credentials are exposed in Git history and must be revoked immediately.

### 1.1 Generate New MQTT Credentials

**For HiveMQ Cloud:**
1. Log in to [HiveMQ Cloud Console](https://console.hivemq.cloud)
2. Navigate to your cluster
3. Go to "Access Management"
4. Create new credentials:
   - Username: `mqtt_bridge_prod_2025`
   - Password: Generate strong password (min 16 characters)
   - Permissions: Publish/Subscribe on all topics
5. **Save credentials securely** (password manager)

### 1.2 Store Credentials in Google Secret Manager

```bash
# Set your GCP project
export GCP_PROJECT_ID="my-app-da530"
gcloud config set project $GCP_PROJECT_ID

# Create secrets
echo -n "mqtts://your-broker.hivemq.cloud:8883" | \
  gcloud secrets create mqtt-broker --data-file=-

echo -n "mqtt_bridge_prod_2025" | \
  gcloud secrets create mqtt-username --data-file=-

echo -n "YOUR_STRONG_PASSWORD_HERE" | \
  gcloud secrets create mqtt-password --data-file=-

# Verify secrets were created
gcloud secrets list
```

### 1.3 Grant Cloud Run Access to Secrets

```bash
# Get Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe mqtt-bridge \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant Secret Accessor role
for SECRET in mqtt-broker mqtt-username mqtt-password; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 1.4 Update Cloud Run Service Configuration

**Option A: Using Console**
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on `mqtt-bridge` service
3. Click "Edit & Deploy New Revision"
4. Under "Container" > "Variables & Secrets"
5. Add environment variables referencing secrets:
   - `MQTT_BROKER` → Reference secret `mqtt-broker`
   - `MQTT_USERNAME` → Reference secret `mqtt-username`
   - `MQTT_PASSWORD` → Reference secret `mqtt-password`
6. Click "Deploy"

**Option B: Using gcloud CLI**
```bash
gcloud run services update mqtt-bridge \
  --region=us-central1 \
  --update-secrets=MQTT_BROKER=mqtt-broker:latest \
  --update-secrets=MQTT_USERNAME=mqtt-username:latest \
  --update-secrets=MQTT_PASSWORD=mqtt-password:latest
```

### 1.5 Verify MQTT Bridge Connection

```bash
# Check service logs
gcloud run services logs read mqtt-bridge \
  --region=us-central1 \
  --limit=50

# Look for:
# ✓ Environment variables validated
# ✓ Connected to MQTT broker
```

### 1.6 Revoke Old Credentials

**IMPORTANT:** Only do this after verifying the new credentials work!

1. Go back to HiveMQ Cloud Console
2. Find the old credentials (`functions2025`)
3. Delete the credential
4. Monitor logs to ensure no connection errors

---

## 📧 STEP 2: Migrate Email Credentials (CRITICAL)

**Why:** Gmail app password is exposed in source code and Git history.

### 2.1 Generate New Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already enabled)
3. Go to "App Passwords"
4. Generate new app password:
   - App: Mail
   - Device: Firebase Functions
5. **Save the 16-character password**

### 2.2 Store Credentials in Firebase Secret Manager

```bash
# Navigate to functions directory
cd functions

# Set secrets using Firebase CLI
firebase functions:secrets:set EMAIL_USER
# When prompted, enter: hed-tjyuzon@smu.edu.ph

firebase functions:secrets:set EMAIL_PASSWORD
# When prompted, enter the 16-character app password

# Verify secrets
firebase functions:secrets:access EMAIL_USER
```

### 2.3 Update Functions That Send Emails

The code has been updated, but you need to update function declarations to include secrets.

**Example - Update `functions/src/scheduler/checkStaleAlerts.ts`:**

```typescript
import { EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF } from '../config/email';

export const checkStaleAlerts = onSchedule(
  {
    schedule: 'every 2 hours',
    secrets: [EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF], // ADD THIS LINE
  },
  async (event) => {
    // Function implementation
  }
);
```

**Update these files:**
- `functions/src/scheduler/checkStaleAlerts.ts`
- `functions/src/scheduler/sendAlertDigests.ts`
- `functions/src/scheduler/sendDailyAnalytics.ts`
- Any other function that sends emails

### 2.4 Deploy Functions with Secrets

```bash
cd functions

# Build functions
npm run build

# Deploy functions (will prompt for secret access)
firebase deploy --only functions

# When prompted about secrets, confirm access
```

### 2.5 Test Email Notifications

```bash
# Trigger a test email function
firebase functions:shell

# In the shell, call your email function
> checkStaleAlerts()

# Or use Cloud Console to test scheduled functions
```

### 2.6 Revoke Old App Password

**IMPORTANT:** Only after verifying new password works!

1. Go back to Google Account > App Passwords
2. Find and revoke the old app password
3. Monitor function logs for email sending errors

---

## 🔥 STEP 3: Update Client Firebase Configuration

**Why:** Firebase API key and project details should not be in source code.

### 3.1 Create Environment File

```bash
cd client

# Copy example file
cp .env.example .env

# Edit .env with your Firebase configuration
nano .env  # or use your preferred editor
```

**Fill in `.env` with your Firebase project details:**
```bash
VITE_FIREBASE_API_KEY=AIzaSyDAwRnWPlb54lWqk6r0nNKIstJif1R7oxM
VITE_FIREBASE_AUTH_DOMAIN=my-app-da530.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://my-app-da530-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=my-app-da530
VITE_FIREBASE_STORAGE_BUCKET=my-app-da530.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=8158575421
VITE_FIREBASE_APP_ID=1:8158575421:web:d4a32e4212ff393341a354
VITE_FIREBASE_MEASUREMENT_ID=G-7J869G2ZPE
VITE_APP_URL=http://localhost:5173
```

### 3.2 Verify .env is in .gitignore

```bash
# Check .gitignore
cat .gitignore | grep ".env"

# Should see:
# *.local
# .env

# If not present, add it:
echo ".env" >> .gitignore
```

### 3.3 Build and Test Client

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Verify Firebase connection
# Should see in console:
# ✓ Firebase initialized successfully
```

### 3.4 Configure Firebase App Check (Recommended)

Protect against API key abuse:

```bash
# Enable App Check in Firebase Console
# 1. Go to Firebase Console > App Check
# 2. Register your web app
# 3. Enable reCAPTCHA v3 for web
# 4. Add authorized domains

# Update client code to initialize App Check
```

**Add to `client/src/config/firebase.ts`:**
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// After initializing app
if (!import.meta.env.DEV) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
    isTokenAutoRefreshEnabled: true
  });
}
```

### 3.5 Deploy Client to Firebase Hosting

```bash
# Build production version
npm run build

# Deploy
firebase deploy --only hosting

# Test production deployment
# Visit: https://my-app-da530.web.app
```

---

## 🗄️ STEP 4: Harden Realtime Database Rules

**Why:** Current rules allow anyone to read sensor data without authentication.

### 4.1 Review Updated Rules

The `database.rules.json` has been updated. Review the changes:

```json
{
  "rules": {
    "sensorReadings": {
      "$deviceId": {
        ".read": "auth != null && (auth.token.status == 'Approved' || root.child('serviceAccounts').child(auth.uid).exists())",
        ".write": "root.child('serviceAccounts').child(auth.uid).exists()",
        ".validate": "newData.hasChildren(['timestamp']) && newData.child('timestamp').isNumber()"
      }
    },
    "serviceAccounts": {
      ".read": false,
      ".write": false
    }
  }
}
```

### 4.2 Create Service Account Registry

Before deploying rules, register Cloud Functions service account:

```bash
# Get Functions service account UID
firebase functions:log | grep "Service account UID"

# Or manually in Firebase Console:
# Firestore > Create new document in 'serviceAccounts' collection
# Document ID: <functions-service-account-uid>
# Fields: { authorized: true, service: 'firebase-functions' }
```

**Using Firebase Console:**
1. Go to Realtime Database
2. Create path: `/serviceAccounts`
3. Add child with Functions service account UID as key
4. Set value: `{ "authorized": true, "service": "firebase-functions" }`

### 4.3 Deploy Updated Rules

```bash
# From project root
firebase deploy --only database

# Verify rules are active
firebase database:get /
```

### 4.4 Test Database Access

**Test as authenticated user:**
```javascript
// In browser console (after logging in)
import { getDatabase, ref, get } from 'firebase/database';

const db = getDatabase();
const sensorRef = ref(db, 'sensorReadings/device_001');

get(sensorRef)
  .then(snapshot => console.log('✅ Authorized access:', snapshot.val()))
  .catch(error => console.error('❌ Access denied:', error));
```

**Test as unauthenticated user:**
```bash
# Should fail with permission denied
curl "https://my-app-da530-default-rtdb.firebaseio.com/sensorReadings.json"
```

---

## ✅ STEP 5: Verification Checklist

### 5.1 MQTT Bridge
- [ ] New credentials stored in Secret Manager
- [ ] Cloud Run service configured with secret references
- [ ] Service logs show successful connection
- [ ] Sensor data flowing to Pub/Sub
- [ ] Old credentials revoked

### 5.2 Email Notifications
- [ ] New app password stored in Firebase Secrets
- [ ] All email functions updated with secret references
- [ ] Functions deployed successfully
- [ ] Test email sent successfully
- [ ] Old app password revoked

### 5.3 Client Configuration
- [ ] `.env` file created with Firebase config
- [ ] `.env` added to `.gitignore`
- [ ] Development server runs without errors
- [ ] Production build succeeds
- [ ] Firebase App Check enabled (optional but recommended)
- [ ] Hosting deployment successful

### 5.4 Database Rules
- [ ] Service account registered in Realtime Database
- [ ] Rules deployed successfully
- [ ] Authenticated access works
- [ ] Unauthenticated access blocked
- [ ] Functions can still write sensor data

### 5.5 Security Verification
- [ ] No hardcoded credentials in source code
- [ ] Git history cleaned (see Step 6)
- [ ] All services using environment variables
- [ ] Secrets properly scoped (least privilege)
- [ ] Monitoring and alerting configured

---

## 🧹 STEP 6: Clean Git History (Optional but Recommended)

**Warning:** This rewrites Git history. Coordinate with team before proceeding.

### 6.1 Remove Sensitive Data from History

```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# Or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create file with patterns to remove
cat > secrets.txt << EOF
Jaffmier@0924
khjo xjed akne uonm
functions2025
AIzaSyDAwRnWPlb54lWqk6r0nNKIstJif1R7oxM
EOF

# Clean repository
bfg --replace-text secrets.txt .

# Force push cleaned history (coordinate with team!)
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### 6.2 Alternative: Create New Repository

If you can't rewrite history:
1. Create new repository
2. Copy only necessary files (excluding .git)
3. Initialize fresh Git history
4. Push to new repository
5. Update all references

---

## 🔒 STEP 7: Additional Security Hardening (Recommended)

### 7.1 Enable Firebase Security Features

```bash
# Enable Cloud Armor for DDoS protection
gcloud compute security-policies create firebase-protection \
  --description "DDoS protection for Firebase"

# Configure rate limiting for Cloud Run
gcloud run services update mqtt-bridge \
  --region=us-central1 \
  --max-instances=10 \
  --concurrency=100
```

### 7.2 Set Up Monitoring

**Create Alert Policies:**
1. Go to Cloud Console > Monitoring > Alerting
2. Create alerts for:
   - Failed authentication attempts (> 10/min)
   - MQTT connection failures
   - Email sending failures
   - Function error rate (> 5%)
   - Realtime DB permission denied errors

### 7.3 Configure Audit Logging

```bash
# Enable Data Access audit logs
gcloud logging sinks create audit-logs \
  bigquery.googleapis.com/projects/my-app-da530/datasets/audit_logs \
  --log-filter='protoPayload.methodName:"google.firestore.v1.Firestore"'
```

---

## 📊 STEP 8: Post-Migration Testing

### 8.1 End-to-End Testing

**Test Complete Flow:**
1. Arduino device publishes to MQTT
2. MQTT Bridge forwards to Pub/Sub
3. Cloud Function processes sensor data
4. Data appears in Realtime Database
5. Client displays sensor readings
6. Alerts trigger email notifications

### 8.2 Load Testing

```bash
# Simulate high sensor data volume
for i in {1..100}; do
  mosquitto_pub -h your-broker.hivemq.cloud \
    -p 8883 -u mqtt_bridge_prod_2025 -P YOUR_PASSWORD \
    -t "device/sensordata/device_001" \
    -m '{"ph":7.2,"tds":250,"turbidity":3.5,"timestamp":'$(date +%s000)'}'
  sleep 0.1
done
```

### 8.3 Security Testing

**Test Authentication:**
```bash
# Try to access without authentication (should fail)
curl https://my-app-da530-default-rtdb.firebaseio.com/sensorReadings.json

# Try to access with invalid credentials (should fail)
curl -H "Authorization: Bearer invalid_token" \
  https://my-app-da530-default-rtdb.firebaseio.com/sensorReadings.json
```

**Test RBAC:**
- Log in as Staff user → verify can read but not manage
- Log in as Admin → verify full access
- Try to access admin endpoints as Staff → should fail

---

## 🚨 Troubleshooting

### Issue: MQTT Bridge not connecting

**Symptoms:**
- Logs show "MQTT Error: Connection refused"
- Health check returns unhealthy

**Solutions:**
```bash
# 1. Verify secrets are accessible
gcloud run services describe mqtt-bridge \
  --region=us-central1 \
  --format=yaml | grep -A 10 secrets

# 2. Check secret values
gcloud secrets versions access latest --secret=mqtt-broker
gcloud secrets versions access latest --secret=mqtt-username

# 3. Test MQTT connection locally
mosquitto_sub -h $(gcloud secrets versions access latest --secret=mqtt-broker | sed 's/mqtts:\/\///' | sed 's/:8883//') \
  -p 8883 -u $(gcloud secrets versions access latest --secret=mqtt-username) \
  -P $(gcloud secrets versions access latest --secret=mqtt-password) \
  -t "device/#"
```

### Issue: Email functions failing

**Symptoms:**
- Error: "Email credentials not configured"
- Email notifications not being sent

**Solutions:**
```bash
# 1. Verify secrets exist
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASSWORD

# 2. Check function configuration
firebase functions:config:get

# 3. Re-deploy with explicit secret access
firebase deploy --only functions --force

# 4. Check logs
firebase functions:log
```

### Issue: Client can't connect to Firebase

**Symptoms:**
- "Firebase configuration incomplete" error
- White screen on app load

**Solutions:**
```bash
# 1. Verify .env file exists and is populated
cat client/.env

# 2. Check environment variables are loaded
# In development console:
console.log(import.meta.env.VITE_FIREBASE_API_KEY)

# 3. Rebuild application
cd client
rm -rf dist node_modules/.vite
npm run build
npm run dev
```

### Issue: Database permission denied

**Symptoms:**
- "Permission denied" when reading sensor data
- Functions can't write to Realtime DB

**Solutions:**
```bash
# 1. Verify service account is registered
firebase database:get /serviceAccounts

# 2. Check authentication status
# In browser console after login:
console.log(auth.currentUser)
console.log(await auth.currentUser.getIdTokenResult())

# 3. Re-deploy rules
firebase deploy --only database --force
```

---

## 📝 Documentation Updates

After migration, update these documents:

### README.md
- Update setup instructions with .env configuration
- Remove any hardcoded credentials
- Add secret management section
- Update deployment instructions

### DEPLOYMENT.md (create if doesn't exist)
- Document secret setup procedures
- Include environment variable configuration
- Add troubleshooting guide

### CONTRIBUTING.md (create if doesn't exist)
- Add security guidelines
- Document how to handle secrets in development
- Include code review checklist for security

---

## 🎉 Success Criteria

Migration is complete when:

✅ All services running without hardcoded credentials  
✅ MQTT Bridge connecting successfully with new credentials  
✅ Email notifications sending successfully  
✅ Client application working in dev and prod  
✅ Database rules enforcing authentication  
✅ All tests passing  
✅ No secrets in source code or Git history  
✅ Monitoring and alerting configured  
✅ Team trained on new secret management process  
✅ Documentation updated  
✅ Old credentials revoked  

---

## 📞 Support

If you encounter issues during migration:

1. Check this guide's Troubleshooting section
2. Review Firebase logs: `firebase functions:log`
3. Check Cloud Run logs: `gcloud run services logs read mqtt-bridge`
4. Review the full BUG_REPORT.md for context
5. Contact the infrastructure team

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** Ready for implementation
