# Firebase Functions - Implementation Recommendations

This document provides step-by-step instructions for implementing the recommendations from the Firebase Cloud Architect AI validation report.

## 📋 Priority Overview

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| **P0 (Critical)** | Migrate hardcoded credentials to Secret Manager | 🔴 High Security Risk | 2-4 hours |
| **P1 (High)** | Deploy missing Firestore indexes | 🟡 90% performance improvement | 30 minutes |
| **P2 (Medium)** | Set up CI/CD pipeline | 🟢 Automated quality checks | 2-3 hours |
| **P2 (Medium)** | Add unit tests | 🟢 Code reliability | 4-6 hours |
| **P3 (Low)** | Enhance JSDoc documentation | 🔵 Developer experience | 2-3 hours |

---

## 🔴 P0: Migrate Hardcoded Credentials to Secret Manager

### Current Issue
Credentials are hardcoded in source files:
- `functions/src/config/email.ts` - Email app password
- `mqtt-bridge/index.js` - MQTT broker credentials

### Step 1: Set Up Firebase Secret Manager

```bash
# Navigate to functions directory
cd functions/

# Set email password secret
firebase functions:secrets:set EMAIL_PASSWORD
# Enter the password when prompted: khjo xjed akne uonm

# Set MQTT credentials
firebase functions:secrets:set MQTT_USERNAME
# Enter: functions2025

firebase functions:secrets:set MQTT_PASSWORD
# Enter: Jaffmier@0924
```

### Step 2: Update Email Configuration

Edit `functions/src/config/email.ts`:

```typescript
/**
 * Email Configuration
 * Uses Firebase Secret Manager for secure credential storage
 */

import { defineString, defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import * as nodemailer from "nodemailer";

/**
 * Email address (non-sensitive)
 */
export const EMAIL_USER = defineString("EMAIL_USER", {
  default: "hed-tjyuzon@smu.edu.ph",
});

/**
 * Email password from Secret Manager
 */
const EMAIL_PASSWORD = defineSecret("EMAIL_PASSWORD");

/**
 * Create email transporter
 * Must be called within a function that declares EMAIL_PASSWORD in runWith
 *
 * @returns Configured Nodemailer transporter
 */
export function createEmailTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER.value(),
      pass: EMAIL_PASSWORD.value(),
    },
  });
}

/**
 * Verify email transporter connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    logger.info("Email transporter configured successfully", {
      user: EMAIL_USER.value(),
    });
    return true;
  } catch (error) {
    logger.error("Email transporter verification failed:", error);
    return false;
  }
}
```

### Step 3: Update Functions Using Email

Update all scheduler functions to declare secret dependency:

```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";

const EMAIL_PASSWORD = defineSecret("EMAIL_PASSWORD");

export const sendAlertDigests = onSchedule(
  {
    schedule: "0 */6 * * *",
    timeZone: "UTC",
    secrets: [EMAIL_PASSWORD], // ✅ Declare secret dependency
  },
  async () => {
    // Function implementation
    const transporter = createEmailTransporter();
    // ... rest of function
  }
);
```

### Step 4: Update MQTT Bridge (Cloud Run)

Edit `mqtt-bridge/index.js`:

```javascript
// MQTT Configuration using environment variables
const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER || 'mqtts://36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud:8883',
  username: process.env.MQTT_USERNAME, // ✅ No default fallback
  password: process.env.MQTT_PASSWORD, // ✅ No default fallback
  clientId: `bridge_${Math.random().toString(16).slice(3)}`,
};

// Validate environment variables
if (!MQTT_CONFIG.username || !MQTT_CONFIG.password) {
  console.error('ERROR: MQTT credentials not set in environment variables');
  console.error('Set MQTT_USERNAME and MQTT_PASSWORD before starting');
  process.exit(1);
}
```

Deploy Cloud Run with secrets:

```bash
# Deploy MQTT bridge with secret environment variables
gcloud run deploy mqtt-bridge \
  --source . \
  --region us-central1 \
  --set-env-vars MQTT_BROKER=mqtts://36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud:8883 \
  --set-secrets MQTT_USERNAME=MQTT_USERNAME:latest,MQTT_PASSWORD=MQTT_PASSWORD:latest
```

### Step 5: Redeploy Functions

```bash
cd functions/
npm run build
firebase deploy --only functions
```

### Step 6: Remove Hardcoded Values from Git History (Optional)

```bash
# Use git-filter-repo or BFG Repo-Cleaner to remove sensitive data
# See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
```

---

## 🟡 P1: Deploy Missing Firestore Indexes

### Current Issue
Missing composite index for stale alert queries causes inefficient document filtering in memory.

### Step 1: Verify Updated Indexes

The `firestore.indexes.json` file has been updated with recommended indexes:
- `status + severity + createdAt` (stale alerts optimization)
- `createdAt + severity` (analytics queries)

### Step 2: Deploy Indexes

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Monitor index creation progress
firebase firestore:indexes
```

### Step 3: Verify Query Performance

After index creation completes (may take 5-10 minutes):

```bash
# Check function logs for improved performance
firebase functions:log --only checkStaleAlerts --lines 50
```

Expected improvement:
- Before: ~100 document reads per execution
- After: ~10 document reads per execution (90% reduction)

---

## 🟢 P2: Set Up CI/CD Pipeline

### Current Issue
No automated validation before code deployment.

### Step 1: GitHub Actions Workflow

A workflow file has been created at `.github/workflows/firebase-functions-ci.yml`.

### Step 2: Configure GitHub Secrets (When Ready for Automated Deployment)

```bash
# Generate Firebase CI token
firebase login:ci

# Add secrets to GitHub repository settings:
# Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_TOKEN` - CI token from `firebase login:ci`

### Step 3: Enable Automated Deployment (Optional)

Uncomment deployment steps in `.github/workflows/firebase-functions-ci.yml`:

```yaml
- name: Deploy to Firebase
  run: |
    firebase deploy --only functions --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
```

### Step 4: Test Workflow

```bash
# Create a test branch
git checkout -b test/ci-validation

# Make a small change
echo "// Test CI" >> functions/src/index.ts

# Commit and push
git add .
git commit -m "test: Validate CI/CD pipeline"
git push origin test/ci-validation

# Check GitHub Actions tab for workflow execution
```

---

## 🟢 P2: Add Unit Tests

### Step 1: Install Testing Dependencies

```bash
cd functions/

npm install --save-dev \
  @jest/globals \
  jest \
  ts-jest \
  @types/jest
```

### Step 2: Configure Jest

Create `functions/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.types.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Step 3: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Step 4: Create Test Directory Structure

```bash
mkdir -p functions/src/__tests__/utils
mkdir -p functions/src/__tests__/callable
```

### Step 5: Example Test - Validators

Create `functions/src/__tests__/utils/validators.test.ts`:

```typescript
import { describe, expect, it } from '@jest/globals';
import {
  isValidDeviceId,
  isValidEmail,
  isValidSensorReading,
} from '../../utils/validators';

describe('Device ID Validation', () => {
  it('should accept valid device IDs', () => {
    expect(isValidDeviceId('DEVICE_123')).toBe(true);
    expect(isValidDeviceId('arduino-uno-r4')).toBe(true);
    expect(isValidDeviceId('device_sensor_001')).toBe(true);
  });

  it('should reject invalid device IDs', () => {
    expect(isValidDeviceId('device@invalid')).toBe(false);
    expect(isValidDeviceId('')).toBe(false);
    expect(isValidDeviceId('device with spaces')).toBe(false);
  });

  it('should reject non-string inputs', () => {
    expect(isValidDeviceId(null as any)).toBe(false);
    expect(isValidDeviceId(undefined as any)).toBe(false);
    expect(isValidDeviceId(123 as any)).toBe(false);
  });
});

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@smu.edu.ph')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});

describe('Sensor Reading Validation', () => {
  it('should accept valid sensor readings', () => {
    expect(isValidSensorReading({ turbidity: 5.2, tds: 250, ph: 7.0 })).toBe(true);
    expect(isValidSensorReading({ turbidity: 0 })).toBe(true);
    expect(isValidSensorReading({ ph: 14 })).toBe(true);
  });

  it('should reject out-of-range values', () => {
    expect(isValidSensorReading({ turbidity: -1 })).toBe(false);
    expect(isValidSensorReading({ turbidity: 1001 })).toBe(false);
    expect(isValidSensorReading({ ph: 15 })).toBe(false);
    expect(isValidSensorReading({ tds: -100 })).toBe(false);
  });

  it('should reject non-numeric values', () => {
    expect(isValidSensorReading({ turbidity: 'invalid' as any })).toBe(false);
    expect(isValidSensorReading({ ph: null as any })).toBe(false);
  });
});
```

### Step 6: Run Tests

```bash
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## 🔵 P3: Enhance JSDoc Documentation

### Example: Enhanced Function Documentation

```typescript
/**
 * Process sensor data from IoT devices via Pub/Sub
 *
 * This function is triggered when the MQTT bridge publishes sensor readings
 * to the `iot-sensor-readings` Pub/Sub topic. It processes both single readings
 * and batched readings from devices.
 *
 * **Processing Steps:**
 * 1. Validate device ID and sensor data
 * 2. Store latest reading in Realtime Database
 * 3. Store historical data (filtered every 5th reading)
 * 4. Update device status in Firestore (throttled to 5-min intervals)
 * 5. Check thresholds and create alerts with debouncing
 * 6. Analyze trends and create trend alerts
 *
 * **Quota Optimizations:**
 * - Alert debouncing (5-min cooldown) reduces alert creation by 50-70%
 * - Throttled Firestore updates reduce device writes by 80%
 * - Filtered history storage reduces RTDB writes by 80%
 *
 * @param event - Pub/Sub CloudEvent containing sensor data
 * @param event.data.message.json - Sensor data payload (single or batch)
 * @param event.data.message.attributes.device_id - Device identifier
 *
 * @returns Promise that resolves when processing is complete
 *
 * @throws {Error} When processing fails (triggers automatic retry)
 *
 * @example
 * // Single reading published by MQTT bridge
 * pubsub.topic('iot-sensor-readings').publish({
 *   attributes: { device_id: 'arduino_uno_r4_001' },
 *   json: { turbidity: 5.2, tds: 250, ph: 7.0, timestamp: Date.now() }
 * });
 *
 * @example
 * // Batch reading published by MQTT bridge
 * pubsub.topic('iot-sensor-readings').publish({
 *   attributes: { device_id: 'arduino_uno_r4_001' },
 *   json: {
 *     readings: [
 *       { turbidity: 5.2, tds: 250, ph: 7.0, timestamp: 1698765432000 },
 *       { turbidity: 5.1, tds: 248, ph: 7.1, timestamp: 1698765462000 },
 *       // ... up to 10 readings
 *     ]
 *   }
 * });
 *
 * @see {@link https://firebase.google.com/docs/functions/pubsub-events | Pub/Sub Triggers}
 * @see {@link processSingleReading} for individual reading processing logic
 */
export const processSensorData = onMessagePublished(...)
```

---

## 📊 Monitoring & Observability

### Set Up Cloud Monitoring Alerts

```bash
# Create alert for high function error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Functions Error Rate > 5%" \
  --condition-display-name="Error rate threshold" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s

# Create alert for function timeout
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Function Execution Time > 30s" \
  --condition-display-name="Execution time threshold" \
  --condition-threshold-value=30000 \
  --condition-threshold-duration=60s
```

### Custom Structured Logging

Add to critical functions:

```typescript
logger.info("Sensor data processed", {
  deviceId,
  readingCount: readingsArray.length,
  alertsCreated: alertCount,
  processingTimeMs: Date.now() - startTime,
  structuredData: {
    severity: "INFO",
    labels: {
      function: "processSensorData",
      device_id: deviceId,
    },
    metrics: {
      readings_processed: readingsArray.length,
      alerts_created: alertCount,
      processing_time_ms: Date.now() - startTime,
    },
  },
});
```

---

## 🎯 Success Criteria

### P0 Completion Checklist
- [ ] EMAIL_PASSWORD moved to Secret Manager
- [ ] MQTT credentials moved to Cloud Run secrets
- [ ] Functions redeployed successfully
- [ ] Email notifications still working
- [ ] MQTT bridge still receiving data
- [ ] No credentials visible in source code

### P1 Completion Checklist
- [ ] Firestore indexes deployed
- [ ] Index creation completed (check Firebase Console)
- [ ] `checkStaleAlerts` query time reduced by >80%

### P2 CI/CD Checklist
- [ ] GitHub Actions workflow file created
- [ ] Workflow runs on PR creation
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Firestore validation passes

### P2 Testing Checklist
- [ ] Jest configured
- [ ] At least 10 unit tests written
- [ ] Tests cover validators utility
- [ ] Tests cover threshold helpers
- [ ] Test coverage > 70%

---

## 📝 Additional Resources

- [Firebase Secret Manager Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Firestore Index Best Practices](https://firebase.google.com/docs/firestore/query-data/indexing)
- [GitHub Actions for Firebase](https://github.com/FirebaseExtended/action-hosting-deploy)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

## 🆘 Troubleshooting

### Issue: Secret not found during deployment
**Solution:** Ensure secrets are created in Secret Manager:
```bash
firebase functions:secrets:access EMAIL_PASSWORD
```

### Issue: Index creation stuck
**Solution:** Check Firebase Console → Firestore → Indexes tab for status

### Issue: Tests failing with TypeScript errors
**Solution:** Ensure `tsconfig.json` includes test files:
```json
{
  "include": ["src", "src/__tests__"]
}
```

---

**Document Version:** 1.0  
**Last Updated:** November 2, 2025  
**Maintained By:** Firebase Cloud Architect AI
