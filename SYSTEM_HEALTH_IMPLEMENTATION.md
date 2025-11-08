# Dynamic System Health Calculation Implementation

## Overview
This document describes the implementation of the dynamic system health calculation feature that reflects real-time performance across three core components: **MQTT Bridge**, **Devices**, and **Alerts**.

## Implementation Date
November 8, 2025

## Architecture

### Component Weights
The system health score is calculated using fixed weights for each component:
- **MQTT Bridge**: 60% weight
- **Devices**: 20% weight  
- **Alerts**: 20% weight

### Formula
```
SystemHealthScore = (0.6 × BridgeScore) + (0.2 × DeviceScore) + (0.2 × AlertScore)
```

## Component Scoring Logic

### 1. MQTT Bridge Score (60% weight)
- **Source**: Provided directly from the MQTT Bridge service via `/health` endpoint
- **Range**: 0-100
- **Calculation**: Done by the bridge service based on:
  - RSS memory usage (60% weight)
  - CPU usage (40% weight)
  - Connection status
  - Internal grading logic for healthy/degraded/unhealthy states

### 2. Devices Score (20% weight)
- **Source**: Real-time device status from Firestore
- **Calculation**: `(online devices ÷ total devices) × 100`
- **Dynamic Behavior**: Automatically adapts when devices are added or removed
- **Edge Case**: Returns 100 if no devices exist (nothing to monitor)

**Example**:
```
45 online devices / 50 total devices = 90% device score
```

### 3. Alerts Score (20% weight)
- **Source**: All alerts from Firestore
- **Calculation**: Average score across all alerts
- **Default**: 100 if no alerts exist

#### Alert Scoring Rules

| Alert State | Severity | Score | Description |
|------------|----------|-------|-------------|
| Resolved | Any | 100 | Alert has been resolved |
| Acknowledged | Any | 60 | Alert has been acknowledged |
| Active | Advisory (Normal) | 100 | Low severity, informational |
| Active | Warning | 50 | Medium severity |
| Active | Critical | 0 | High severity, immediate action needed |

**Example Calculation**:
```
Alerts:
- Alert 1: Resolved → 100
- Alert 2: Acknowledged → 60
- Alert 3: Active + Warning → 50
- Alert 4: Active + Critical → 0
- Alert 5: Active + Advisory → 100

Average Score = (100 + 60 + 50 + 0 + 100) ÷ 5 = 62
```

## System Status Categories

The calculated health score (0-100) is translated into a categorical status:

| Score Range | Status | Description |
|------------|--------|-------------|
| 90-100 | **Healthy** | All systems operating normally |
| 60-89 | **Degraded** | Some systems require attention |
| 0-59 | **Unhealthy** | Critical issues detected |

## Quick Reference

### Visual Example

```
┌─────────────────────────────────────────────────────────────┐
│              OVERALL SYSTEM HEALTH: 87%                     │
│                    (Degraded)                               │
│                                                             │
│   ┌───────────────────────────────────────────┐            │
│   │          ╭─────────────╮                  │            │
│   │         │    ●   87%   │                  │            │
│   │         │              │                  │            │
│   │          ╰─────────────╯                  │            │
│   └───────────────────────────────────────────┘            │
│                                                             │
│   COMPONENT BREAKDOWN:                                      │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ MQTT Bridge    92% → +55  (60% weight)             │  │
│   │ Devices        80% → +16  (20% weight, 40/50 online)│  │
│   │ Alerts         80% → +16  (20% weight, 5 total)    │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   Alert Breakdown (5 alerts):                               │
│   • Alert #1: Resolved → 100                                │
│   • Alert #2: Acknowledged → 60                             │
│   • Alert #3: Active + Warning → 50                         │
│   • Alert #4: Active + Warning → 50                         │
│   • Alert #5: Active + Critical → 0                         │
│   Average: (100+60+50+50+0) / 5 = 52 → 80% (rounded)       │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Files

### Core Utility
**File**: `client/src/pages/admin/AdminDashboard/utils/systemHealthCalculator.ts`

Key functions:
- `calculateSystemHealth()` - Main calculation function
- `calculateAlertScore()` - Individual alert scoring
- `calculateAlertsHealthScore()` - Overall alert health
- `calculateDeviceHealthScore()` - Device connectivity score
- `getSystemHealthColor()` - Status color mapping
- `getSystemHealthDescription()` - Status descriptions

### UI Component
**File**: `client/src/pages/admin/AdminDashboard/components/DashboardSummary.tsx`

Displays:
- Large circular health gauge (0-100%)
- Status label (Healthy/Degraded/Unhealthy)
- Component breakdown showing:
  - Individual component scores
  - Component weights
  - Contribution to overall score

## Real-time Behavior

### Dynamic Updates
The system health calculation updates automatically when:
- MQTT Bridge health changes (every 2 seconds)
- Device status changes (real-time via Firestore listener)
- Alert state or severity changes (real-time via Firestore listener)

### No Manual Recalibration Needed
- Device count changes are handled automatically
- Alert additions/removals are reflected immediately
- Component weights remain constant (no configuration required)

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                           │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ MQTT Bridge    │  │ Devices        │  │ Alerts        │ │
│  │ (health data)  │  │ (Firestore)    │  │ (Firestore)   │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                ▼                             │
│                  ┌──────────────────────────┐                │
│                  │ systemHealthCalculator   │                │
│                  │                          │                │
│                  │ • MQTT: 60% weight       │                │
│                  │ • Devices: 20% weight    │                │
│                  │ • Alerts: 20% weight     │                │
│                  └──────────┬───────────────┘                │
│                             ▼                                │
│                  ┌──────────────────────────┐                │
│                  │  SystemHealthResult      │                │
│                  │                          │                │
│                  │  • overallScore: 0-100   │                │
│                  │  • status: string        │                │
│                  │  • components breakdown  │                │
│                  └──────────┬───────────────┘                │
│                             ▼                                │
│                  ┌──────────────────────────┐                │
│                  │   DashboardSummary UI    │                │
│                  │   (Circular Progress)    │                │
│                  └──────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Testing Scenarios

### Scenario 1: All Systems Healthy
```
MQTT Bridge: 95/100
Devices: 48/50 online = 96/100
Alerts: 3 resolved = 100/100

Score = (0.6 × 95) + (0.2 × 96) + (0.2 × 100)
      = 57 + 19.2 + 20
      = 96.2 → 96% (Healthy)
```

### Scenario 2: Degraded System
```
MQTT Bridge: 75/100
Devices: 35/50 online = 70/100
Alerts: 1 critical, 2 warnings = 33/100

Score = (0.6 × 75) + (0.2 × 70) + (0.2 × 33)
      = 45 + 14 + 6.6
      = 65.6 → 66% (Degraded)
```

### Scenario 3: Unhealthy System
```
MQTT Bridge: 40/100
Devices: 20/50 online = 40/100
Alerts: 5 critical alerts = 0/100

Score = (0.6 × 40) + (0.2 × 40) + (0.2 × 0)
      = 24 + 8 + 0
      = 32% (Unhealthy)
```

### Scenario 4: No Devices/Alerts
```
MQTT Bridge: 85/100
Devices: 0/0 = 100/100 (default)
Alerts: 0 = 100/100 (default)

Score = (0.6 × 85) + (0.2 × 100) + (0.2 × 100)
      = 51 + 20 + 20
      = 91% (Healthy)
```

## UI Display

### Main Gauge
- **Type**: Circular dashboard progress indicator
- **Size**: 220px diameter
- **Display**: 
  - Large percentage (0-100%)
  - Status text (Healthy/Degraded/Unhealthy)
  - Color-coded based on status

### Component Breakdown
Shows each component's contribution:
```
MQTT Bridge    95% → +57  (60% weight)
Devices        96% → +19  (20% weight, 48/50 online)
Alerts        100% → +20  (20% weight, 3 total)
```

### Color Coding
- **Healthy** (90-100): Green `#52c41a`
- **Degraded** (60-89): Orange `#faad14`
- **Unhealthy** (0-59): Red `#ff4d4f`

## Benefits

1. **Real-time Accuracy**: Updates automatically without manual intervention
2. **Scalability**: Adapts to any number of devices or alerts
3. **Transparency**: Shows exactly how each component contributes
4. **Actionable**: Clear categorization helps prioritize responses
5. **Consistent**: Uses industry-standard scoring methodology
6. **Maintainable**: Centralized calculation logic in single utility file

## Future Enhancements

Potential improvements:
- [ ] Configurable component weights (via admin settings)
- [ ] Historical health score trending
- [ ] Alert for rapid health score drops
- [ ] Export health reports
- [ ] Custom alert severity thresholds
- [ ] Per-device health scores

## Related Documentation

- `MQTT_HEALTH_RSS_UPDATE.md` - MQTT Bridge health calculation details
- `CPU_MONITORING_IMPLEMENTATION.md` - CPU monitoring for MQTT Bridge
- `ARCHITECTURE.md` - Overall system architecture

## Author
Implementation completed on November 8, 2025
