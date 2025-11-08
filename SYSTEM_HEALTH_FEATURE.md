# System Health Feature Summary

## ✨ New Feature: Dynamic System Health Calculation

### Overview
A real-time system health monitoring feature that provides a comprehensive, weighted health score (0-100%) across three core system components: MQTT Bridge, Devices, and Alerts.

### Key Capabilities

✅ **Real-Time Monitoring**
- Updates automatically every 2 seconds
- No manual recalibration required
- Adapts dynamically to system changes

✅ **Intelligent Scoring**
- MQTT Bridge: 60% weight (infrastructure health)
- Devices: 20% weight (connectivity health)
- Alerts: 20% weight (operational health)

✅ **Smart Alert Evaluation**
- Resolved alerts = 100% (healthy)
- Acknowledged alerts = 60% (in progress)
- Active + Advisory = 100% (informational)
- Active + Warning = 50% (attention needed)
- Active + Critical = 0% (urgent action required)

✅ **Dynamic Device Tracking**
- Automatically calculates: (online devices / total devices) × 100
- Self-adjusting as devices are added or removed
- Example: 45/50 online = 90% device health

### Visual Display

The Admin Dashboard displays:
1. **Large Circular Gauge** (220px)
   - Overall score: 0-100%
   - Status: Healthy / Degraded / Unhealthy
   - Color-coded (Green / Orange / Red)

2. **Component Breakdown**
   - Individual component scores
   - Weight percentages
   - Contribution to overall score
   - Detailed metrics (e.g., "40/50 online")

### Status Categories

| Score | Status | Color | Description |
|-------|--------|-------|-------------|
| 90-100 | ✅ Healthy | Green | All systems operating normally |
| 60-89 | ⚠️ Degraded | Orange | Some systems require attention |
| 0-59 | 🔴 Unhealthy | Red | Critical issues detected |

### Example Calculations

**Scenario 1: Healthy System**
```
MQTT Bridge: 95/100
Devices: 48/50 online = 96/100
Alerts: 3 resolved = 100/100

Score = (0.6 × 95) + (0.2 × 96) + (0.2 × 100)
      = 57 + 19.2 + 20
      = 96% ✅ Healthy
```

**Scenario 2: Degraded System**
```
MQTT Bridge: 75/100
Devices: 35/50 online = 70/100
Alerts: 1 critical, 2 warnings = 33/100

Score = (0.6 × 75) + (0.2 × 70) + (0.2 × 33)
      = 45 + 14 + 6.6
      = 66% ⚠️ Degraded
```

**Scenario 3: Unhealthy System**
```
MQTT Bridge: 40/100
Devices: 20/50 online = 40/100
Alerts: 5 critical = 0/100

Score = (0.6 × 40) + (0.2 × 40) + (0.2 × 0)
      = 24 + 8 + 0
      = 32% 🔴 Unhealthy
```

### Technical Implementation

**Files Added/Modified:**
- ✅ `client/src/pages/admin/AdminDashboard/utils/systemHealthCalculator.ts` (NEW)
- ✅ `client/src/pages/admin/AdminDashboard/utils/index.ts` (NEW)
- ✅ `client/src/pages/admin/AdminDashboard/components/DashboardSummary.tsx` (MODIFIED)
- ✅ `SYSTEM_HEALTH_IMPLEMENTATION.md` (NEW - Documentation)

**Dependencies:**
- Existing MQTT Bridge health data
- Real-time Firestore device listener
- Real-time Firestore alerts listener

### Benefits

1. **Single Source of Truth**: One unified health metric
2. **Actionable Insights**: Clear status categories guide response priority
3. **Transparent Calculation**: Shows exactly how score is derived
4. **Zero Configuration**: Works out-of-the-box with existing data
5. **Scalable**: Handles any number of devices/alerts automatically
6. **Real-time**: Updates within 2 seconds of any change

### Usage

Navigate to **Admin Dashboard** → **Overview Tab** to view:
- Overall system health gauge (center panel)
- Component breakdown showing:
  - MQTT Bridge health (60% weight)
  - Device connectivity (20% weight) 
  - Alert status (20% weight)

### Documentation

For complete technical details, see: `SYSTEM_HEALTH_IMPLEMENTATION.md`

### Quick Links
- [System Health Implementation Guide](./SYSTEM_HEALTH_IMPLEMENTATION.md)
- [MQTT Bridge Health](./MQTT_HEALTH_RSS_UPDATE.md)
- [CPU Monitoring](./CPU_MONITORING_IMPLEMENTATION.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

**Implementation Date**: November 8, 2025  
**Status**: ✅ Production Ready
