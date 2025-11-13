# 🔍 Quick Diagnostic - Please Run These Checks

## Step 1: Open Browser Console (F12)

Refresh your Admin Dashboard page and look for these specific log messages:

---

## Expected Logs (in order):

### 1. Service Layer Logs ✅ (You're seeing these)
```
[MqttService] Fetching health from: ...
[MqttService] Health response received: {status: 'healthy', metricsReceived: 0, ...}
[MqttService] Fetching status from: ...
[MqttService] Status response received: {uptime: 476, metricsReceived: 0, ...}
```

### 2. Hook Layer Logs ✅ (You're seeing these)
```
[useRealtime_MQTTMetrics] State: {isLoading: false, healthData: true, statusData: true, ...}
```

### 3. **Component Logs (MISSING - Need to check these):**

#### A. AdminDashboard logs (should see):
```
[AdminDashboard] Passing props to DashboardSummary: {
  mqttHealth: { ... },
  mqttFullHealth: { ... },
  ...
}
```

#### B. DashboardSummary logs (should see):
```
[DashboardSummary] mqttFullHealth received: {
  exists: true,
  hasMetrics: true,
  metrics: { received: 0, published: 0, ... }
}
[DashboardSummary] Current metrics: { received: 0, published: 0, timestamp: ... }
[DashboardSummary] Previous metrics: null (first run) or { ... }
```

#### C. LiveMetricIndicator logs (should see):
```
[LiveMetricIndicator Incoming Messages] Props: {
  currentValue: 0,
  totalValue: 0,
  loading: false,
  dataHistoryLength: 0
}
```

---

## Step 2: Expand the State Logs

In your console, click on this log line:
```
[useRealtime_MQTTMetrics] State: {isLoading: false, isPolling: false, healthData: true, ...}
```

Then expand these fields and tell me what you see:
- **healthMetrics:** { ... }  ← Expand this
- **statusMetrics:** { ... }  ← Expand this

They should look like:
```javascript
healthMetrics: {
  received: 0,
  published: 0,
  failed: 0,
  flushes: 0,
  droppedUnmatched: 0,
  droppedBufferFull: 0,
  circuitBreakerOpen: false
}
```

---

## Step 3: Check the Visual UI

On the Admin Dashboard Overview tab, you should see three cards on the right side:

### Card 1: "Incoming Messages"
- Big number: **0** (in green)
- Unit: msg/s
- Debug text below (if in dev mode): `Debug: cv=0, tv=0`

### Card 2: "Outgoing Messages"  
- Big number: **0** (in blue)
- Unit: msg/s
- Debug text below: `Debug: cv=0, tv=0`

### Card 3: "MQTT Bridge Health"
- Big number: **85%** or similar (health score)
- Unit: %
- Subtitle: RAM usage and CPU info

---

## Step 4: Filter Console Logs

To make it easier, filter your console:

### Option A: Show only MQTT-related logs
Filter by: `mqtt`

### Option B: Show only DashboardSummary logs
Filter by: `DashboardSummary`

### Option C: Show only LiveMetricIndicator logs
Filter by: `LiveMetricIndicator`

---

## What to Report Back

Please share:

1. **Do you see `[AdminDashboard]` logs?** (Yes/No)
2. **Do you see `[DashboardSummary]` logs?** (Yes/No)  
3. **Do you see `[LiveMetricIndicator]` logs?** (Yes/No)
4. **What do the cards show visually?**
   - Incoming Messages: `___`
   - Outgoing Messages: `___`
   - MQTT Bridge Health: `___`
5. **Expanded `healthMetrics` object:** (paste here)
6. **Expanded `statusMetrics` object:** (paste here)

---

## Most Likely Scenarios

### Scenario A: You see ALL the logs + metrics are 0
**Diagnosis:** ✅ System working perfectly, just no traffic
**Action:** No fix needed, start IoT device to see metrics change

### Scenario B: You DON'T see component logs
**Diagnosis:** 🔴 Component not rendering or logs suppressed
**Action:** Check if NODE_ENV is 'development'

### Scenario C: You see logs but UI shows loading/blank
**Diagnosis:** 🔴 Props not passed correctly or component error
**Action:** Check for React errors in console

---

## Quick Terminal Check

Run this to verify your dev mode:
```powershell
# Check if NODE_ENV is set
echo $env:NODE_ENV

# If empty or 'production', set it:
$env:NODE_ENV = "development"
```

Then restart your dev server.

---

## Screenshot Request (Optional)

If possible, share a screenshot of:
1. The Overview tab showing the three metric cards
2. The console with logs expanded

This will help diagnose the exact issue immediately.

