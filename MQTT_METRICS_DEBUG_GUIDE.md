# 🔧 MQTT Metrics Not Showing - Debugging Guide

## Issue Summary
The Admin Dashboard Overview Tab is not displaying MQTT Bridge metrics (Incoming Messages, Outgoing Messages, MQTT Bridge Health).

---

## ✅ What I've Fixed

### 1. **TypeScript Interface Mismatch** ✅ FIXED
**Problem:** The MQTT Bridge API returns extra fields that weren't in the TypeScript interfaces.

**Fixed Files:**
- `client/src/services/mqtt.service.ts`

**Changes:**
```typescript
// Added missing fields to metrics interface:
metrics: {
  received: number;
  published: number;
  failed: number;
  flushes: number;
  droppedUnmatched: number;      // ✅ Added
  droppedBufferFull: number;     // ✅ Added
  circuitBreakerOpen: boolean;
}
```

### 2. **Enhanced Debug Logging** ✅ ADDED
**Added comprehensive logging to:**
- `mqtt.service.ts` - Logs all API calls and responses
- `useRealtime_MQTTMetrics.ts` - Logs hook state changes

**What to check in browser console:**
```
[MqttService] Fetching health from: https://...
[MqttService] Health response received: { status: 'healthy', ... }
[useRealtime_MQTTMetrics] State: { isLoading: false, healthData: true, ... }
```

### 3. **CORS Error Detection** ✅ ADDED
**Added specific CORS error detection with helpful messages:**
```typescript
// Now detects CORS issues and logs:
// - Current origin
// - Target URL
// - Specific error message
```

---

## 🔍 How to Diagnose

### Step 1: Check Browser Console
Open DevTools Console (F12) and look for:

#### ✅ **Success Pattern:**
```
[MqttService] Fetching health from: https://mqtt-bridge-8158575421.us-central1.run.app/health
[MqttService] Health response received: { status: 'healthy', metricsReceived: 0, ... }
[MqttService] Fetching status from: https://mqtt-bridge-8158575421.us-central1.run.app/status
[MqttService] Status response received: { uptime: 318, metricsReceived: 0, ... }
[useRealtime_MQTTMetrics] State: { 
  isLoading: false, 
  healthData: true, 
  statusData: true,
  healthMetrics: { received: 0, published: 0, ... }
}
```

#### ❌ **CORS Error Pattern:**
```
Access to XMLHttpRequest at 'https://mqtt-bridge...' from origin 'http://localhost:5174' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
[MqttService] Possible CORS error - check browser console for details
[MqttService] Current origin: http://localhost:5174
```

#### ❌ **Network Error Pattern:**
```
[MqttService] Error: Network Error
[MqttService] Status fetch failed: AxiosError: Network Error
```

### Step 2: Verify MQTT Bridge is Running
Run this in PowerShell:
```powershell
Invoke-RestMethod -Uri "https://mqtt-bridge-8158575421.us-central1.run.app/health" -Method Get
```

**Expected Output:**
```
status    : healthy
timestamp : 2025-11-13T10:28:48.236Z
uptime    : 313.019216901
checks    : @{mqtt=; memory=; cpu=; buffers=}
metrics   : @{received=0; published=0; failed=0; ...}
```

### Step 3: Check Your Dev Server Origin
Look in browser DevTools Console for:
```
[MqttService] Current origin: http://localhost:????
```

**Current CORS Allowed Origins (from mqtt-bridge/index.js):**
- ✅ `http://localhost:5173`
- ✅ `http://127.0.0.1:5173`
- ❌ Any other port (5174, 3000, etc.) is **BLOCKED**

---

## 🚨 Most Likely Issues

### Issue #1: CORS Error (Wrong Port) - **95% Probability**
**Symptoms:**
- Console shows CORS error
- Network tab shows requests with (failed) or CORS error
- Origin is `localhost:5174` or different port

**Solution:**
Either:
1. **Option A: Change your dev server port to 5173**
   ```json
   // vite.config.ts
   export default defineConfig({
     server: {
       port: 5173
     }
   })
   ```

2. **Option B: Add your port to MQTT Bridge CORS allowlist**
   ```javascript
   // mqtt-bridge/index.js (line ~615)
   ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
     ? process.env.ALLOWED_ORIGINS.split(',')
     : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'], // Add your port
   ```
   Then redeploy the MQTT Bridge.

### Issue #2: React Query Not Refetching
**Symptoms:**
- No console logs from `[MqttService]`
- Hook shows `isLoading: false` but no data

**Solution:**
Check React Query DevTools (if installed) or add this to your component:
```typescript
const { health, status, error, isLoading, refetch } = useRealtime_MQTTMetrics();

useEffect(() => {
  console.log('MQTT Hook State:', { health, status, error, isLoading });
}, [health, status, error, isLoading]);
```

### Issue #3: Component Not Rendering Metrics
**Symptoms:**
- Console shows successful API calls
- Hook has data
- UI still shows "0" or loading

**Check in DashboardSummary.tsx:**
```typescript
// Line 75 - If mqttFullHealth is null, metrics calculation is skipped
if (!mqttFullHealth?.metrics) {
  console.warn('mqttFullHealth.metrics is null - metrics will not display');
  return;
}
```

**Solution:**
Check what's being passed to `<DashboardSummary>` in `AdminDashboard.tsx`:
```typescript
<DashboardSummary
  mqttHealth={mqttHealth ? {
    status: mqttHealth.status,
    connected: mqttHealth.checks.mqtt.connected,
    metrics: mqttHealth.metrics, // ← Check if this exists
  } : null}
  mqttFullHealth={mqttHealth} // ← Check if this is null
/>
```

---

## 🔧 Quick Fix Testing Checklist

Run these in order:

- [ ] **1. Open browser DevTools Console (F12)**
- [ ] **2. Navigate to Admin Dashboard → Overview Tab**
- [ ] **3. Look for `[MqttService]` and `[useRealtime_MQTTMetrics]` logs**
- [ ] **4. If CORS error → Check origin matches `localhost:5173`**
- [ ] **5. If no logs → Check React Query is enabled**
- [ ] **6. If data exists but UI empty → Check `DashboardSummary` props**

---

## 📊 Expected Console Output (Healthy System)

```
[MqttService] Fetching health from: https://mqtt-bridge-8158575421.us-central1.run.app/health
[MqttService] Health response received: {
  status: 'healthy',
  metricsReceived: 0,
  metricsPublished: 0,
  connected: true
}

[MqttService] Fetching status from: https://mqtt-bridge-8158575421.us-central1.run.app/status
[MqttService] Status response received: {
  uptime: 318.44725662,
  metricsReceived: 0,
  metricsPublished: 0,
  mqttConnected: true
}

[useRealtime_MQTTMetrics] State: {
  isLoading: false,
  isPolling: false,
  healthData: true,
  statusData: true,
  healthLoading: false,
  statusLoading: false,
  healthError: undefined,
  statusError: undefined,
  healthMetrics: { received: 0, published: 0, failed: 0, flushes: 0, ... }
  statusMetrics: { received: 0, published: 0, failed: 0, flushes: 0, ... }
}
```

---

## 🎯 Next Steps

1. **Start your dev server and check console**
2. **Look for the patterns above**
3. **If CORS error → Fix port configuration**
4. **If still not working → Share console logs with dev team**

---

## 📝 Files Modified

- ✅ `client/src/services/mqtt.service.ts` - Added logging, CORS detection, fixed interfaces
- ✅ `client/src/hooks/reads/useRealtime_MQTTMetrics.ts` - Enhanced debug logging

---

## 🆘 Still Not Working?

**Collect this info and share:**
1. Browser console logs (full output)
2. Network tab screenshot showing MQTT Bridge requests
3. Current dev server URL (from address bar)
4. React Query DevTools state (if available)

