# Health Thresholds - Single Source of Truth

## Overview

This document describes the **centralized health threshold system** for the Admin Dashboard. All health status calculations are now managed through a single configuration file: `config/healthThresholds.ts`.

## Problem Solved

Previously, different components used **inconsistent threshold definitions**, leading to:
- ❌ Same metrics showing "Healthy" in one component and "Unhealthy" in another
- ❌ Duplicate threshold logic scattered across multiple files
- ❌ Difficulty maintaining consistent health status across the system
- ❌ Confusion for users about actual system health

## Solution

✅ **Single Source of Truth**: All thresholds defined in one place  
✅ **Consistent Calculations**: All components use the same health functions  
✅ **Easy Maintenance**: Update thresholds in one location  
✅ **Type Safety**: TypeScript ensures consistent usage  
✅ **Clear Documentation**: Well-documented threshold ranges

---

## Threshold Definitions

### 1. Memory Usage Thresholds

**Applies to**: Heap Memory and RSS Memory

| Range | Status | Color | Description |
|-------|--------|-------|-------------|
| < 60% | Healthy | Green (#52c41a) | Optimal memory usage |
| 60-84% | Warning | Orange (#faad14) | Elevated memory usage |
| ≥ 85% | Critical | Red (#ff4d4f) | High memory pressure |

**Constants**:
```typescript
MEMORY_THRESHOLDS = {
  HEALTHY_MAX: 60,
  WARNING_MAX: 84,
  CRITICAL_MIN: 85,
}
```

**Usage**:
```typescript
import { getMemoryHealth } from '../config';

const memoryHealthData = getMemoryHealth(memoryPercent);
// Returns: { status: 'excellent' | 'warning' | 'critical', color: string, displayPercent: number }
```

---

### 2. Buffer Utilization Thresholds

**Applies to**: MQTT message buffers

| Range | Status | Color | Description |
|-------|--------|-------|-------------|
| < 50% | Healthy | Green (#52c41a) | Normal buffer usage |
| 50-79% | Warning | Orange (#faad14) | Moderate buffer usage |
| ≥ 80% | Critical | Red (#ff4d4f) | Buffer near capacity |

**Constants**:
```typescript
BUFFER_THRESHOLDS = {
  HEALTHY_MAX: 50,
  WARNING_MAX: 79,
  CRITICAL_MIN: 80,
}
```

**Usage**:
```typescript
import { getBufferHealth } from '../config';

const bufferHealthData = getBufferHealth(utilizationPercent);
// Returns: { status: 'excellent' | 'warning' | 'critical', color: string, displayPercent: number }
```

---

### 3. Device Health Thresholds

**Applies to**: Percentage of devices online

| Range | Status | Color | Status Text |
|-------|--------|-------|-------------|
| 100% | Perfect | Green (#52c41a) | All Online |
| 80-99% | Healthy | Green (#52c41a) | Healthy |
| 50-79% | Degraded | Orange (#faad14) | Degraded |
| < 50% | Critical | Red (#ff4d4f) | Critical |

**Constants**:
```typescript
DEVICE_THRESHOLDS = {
  PERFECT: 100,
  HEALTHY_MIN: 80,
  DEGRADED_MIN: 50,
}
```

**Usage**:
```typescript
import { getDeviceHealth } from '../config';

const deviceHealthData = getDeviceHealth(onlinePercent, hasDevices);
// Returns: { status: HealthStatus, color: string, displayPercent: number, statusText: string }
```

---

### 4. Overall System Health Thresholds

**Applies to**: Composite system health score

| Range | Status | Color | Description |
|-------|--------|-------|-------------|
| ≥ 80% | Excellent | Green (#52c41a) | System performing optimally |
| 60-79% | Good | Light Green (#95de64) | System in good condition |
| 40-59% | Fair | Dark Orange (#fa8c16) | System needs attention |
| < 40% | Poor | Red (#ff4d4f) | System in poor condition |

**Constants**:
```typescript
OVERALL_HEALTH_THRESHOLDS = {
  EXCELLENT_MIN: 80,
  GOOD_MIN: 60,
  FAIR_MIN: 40,
}
```

**Usage**:
```typescript
import { getOverallHealth } from '../config';

const overallHealthData = getOverallHealth(healthPercent);
// Returns: { status: HealthStatus, color: string, displayPercent: number, statusText: string }
```

---

### 5. Success Rate Thresholds

**Applies to**: MQTT message processing success rate

| Range | Status | Color | Description |
|-------|--------|-------|-------------|
| ≥ 95% | Excellent | Green (#52c41a) | Optimal processing |
| 80-94% | Warning | Orange (#faad14) | Some failures occurring |
| < 80% | Critical | Red (#ff4d4f) | High failure rate |

**Constants**:
```typescript
SUCCESS_RATE_THRESHOLDS = {
  EXCELLENT_MIN: 95,
  WARNING_MIN: 80,
}
```

**Usage**:
```typescript
import { getSuccessRateHealth } from '../config';

const successRateHealthData = getSuccessRateHealth(successPercent);
// Returns: { status: HealthStatus, color: string, displayPercent: number }
```

---

## Composite Health Calculations

### Overall System Health Calculation

The overall system health is calculated using a **weighted average** of component health scores:

```typescript
Overall Health = (Device Health × 30%) + 
                 (Alert Health × 30%) + 
                 (MQTT Bridge × 25%) + 
                 (RAM Usage × 15%)
```

**Weights Explained**:
- **Device Health (30%)**: Critical indicator of infrastructure availability
- **Alert Health (30%)**: Critical indicator of system issues
- **MQTT Bridge (25%)**: Important for data flow and processing
- **RAM Usage (15%)**: Important but less critical than above

**Usage**:
```typescript
import { calculateOverallSystemHealth } from '../config';

const overallHealth = calculateOverallSystemHealth(
  deviceHealthScore,    // 0-100
  alertHealthScore,     // 0-100
  mqttHealthScore,      // 0-100
  ramHealthScore        // 0-100
);
// Returns: number (0-100)
```

### MQTT Bridge Health Calculation

MQTT Bridge health considers both memory efficiency and connection status:

```typescript
MQTT Health = (100 - Average Memory Usage) × Connection Factor × Status Factor
```

Where:
- **Average Memory Usage** = (Heap % + RSS %) / 2
- **Connection Factor** = 1.0 if connected, 0 if not
- **Status Factor** = 1.0 if healthy, 0.5 if unhealthy

**Usage**:
```typescript
import { calculateMqttBridgeHealthScore } from '../config';

const mqttScore = calculateMqttBridgeHealthScore(
  heapUsed,      // bytes
  heapTotal,     // bytes
  rss,           // bytes
  connected,     // boolean
  status         // 'healthy' | 'unhealthy'
);
// Returns: number (0-100)
```

### Alert Health Calculation

Alert health is calculated based on severity and count:

```typescript
if (critical > 0) return 0;           // Any critical = 0%
if (total === 0) return 100;          // No alerts = 100%
return 100 - (active / total × 100);  // Proportional to active alerts
```

**Usage**:
```typescript
import { calculateAlertHealthScore } from '../config';

const alertScore = calculateAlertHealthScore(total, active, critical);
// Returns: number (0-100)
```

---

## Color Palette

All health-related colors are centralized in `HEALTH_COLORS`:

```typescript
export const HEALTH_COLORS = {
  EXCELLENT: '#52c41a',  // Green
  GOOD: '#95de64',       // Light Green
  WARNING: '#faad14',    // Orange
  CRITICAL: '#fa8c16',   // Dark Orange
  ERROR: '#ff4d4f',      // Red
  UNKNOWN: '#d9d9d9',    // Gray
  INFO: '#1890ff',       // Blue
}
```

---

## Migration Guide

### Before (Inconsistent)

```typescript
// MemoryMonitor.tsx
const getMemoryStatus = (percent: number) => {
  if (percent < 60) return 'success';
  if (percent < 85) return 'normal';
  return 'exception';
};

// DashboardSummary.tsx
const getHealthColor = (percent: number) => {
  if (percent >= 80) return '#52c41a';
  if (percent >= 60) return '#faad14';
  return '#ff4d4f';
};
```

### After (Consistent)

```typescript
// All components
import { getMemoryHealth, getProgressStatus } from '../config';

const memoryHealthData = getMemoryHealth(memoryPercent);
const progressStatus = getProgressStatus(memoryHealthData.status);
// Always returns consistent values across all components
```

---

## Components Updated

The following components now use the centralized threshold system:

1. ✅ `MemoryMonitor.tsx` - Memory health calculations
2. ✅ `BufferMonitor.tsx` - Buffer utilization
3. ✅ `DashboardSummary.tsx` - Overall system health
4. ✅ `DeviceStatusCard.tsx` - Device health status
5. ✅ `MqttBridgeStatusCard.tsx` - MQTT success rate
6. ✅ `SystemHealthCard.tsx` - Composite health scores
7. ✅ `MetricIndicator.tsx` - Health color calculations

---

## Best Practices

### DO ✅

- Always import health functions from `'../config'`
- Use the centralized calculators for all health determinations
- Reference `HEALTH_COLORS` for color values
- Use TypeScript types provided by the config module

### DON'T ❌

- Create new threshold logic in components
- Hardcode color values
- Duplicate health calculation logic
- Use different thresholds for the same metric

---

## Updating Thresholds

To change health thresholds system-wide:

1. Open `client/src/pages/admin/AdminDashboard/config/healthThresholds.ts`
2. Modify the desired threshold constant
3. All components automatically use the new threshold
4. No other files need to be updated

**Example**:
```typescript
// To make memory thresholds more strict
export const MEMORY_THRESHOLDS = {
  HEALTHY_MAX: 50,      // Changed from 60
  WARNING_MAX: 74,      // Changed from 84
  CRITICAL_MIN: 75,     // Changed from 85
}
```

---

## Testing

To verify consistency across components:

1. Check that all components show the same health status for identical values
2. Verify color consistency across the dashboard
3. Ensure threshold boundaries trigger correct status changes
4. Test edge cases (0%, 50%, 100%)

---

## Architecture Benefits

### Maintainability
- Single file to update for all threshold changes
- Easy to understand and audit
- Clear documentation of all thresholds

### Consistency
- All components use identical logic
- No conflicting health statuses
- Unified color scheme

### Type Safety
- TypeScript enforces correct usage
- Return types clearly documented
- Compile-time error detection

### Performance
- Memoized calculations in components
- Efficient health score algorithms
- Minimal computational overhead

---

## API Reference

### Health Status Type

```typescript
type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'error' | 'unknown';
```

### Core Functions

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `getMemoryHealth()` | `usagePercent: number` | `{ status, color, displayPercent }` | Calculate memory health |
| `getBufferHealth()` | `utilizationPercent: number` | `{ status, color, displayPercent }` | Calculate buffer health |
| `getDeviceHealth()` | `onlinePercent: number, hasDevices: boolean` | `{ status, color, displayPercent, statusText }` | Calculate device health |
| `getOverallHealth()` | `healthPercent: number` | `{ status, color, displayPercent, statusText }` | Calculate overall health |
| `getSuccessRateHealth()` | `successPercent: number` | `{ status, color, displayPercent }` | Calculate success rate health |
| `getProgressStatus()` | `status: HealthStatus` | `'success' \| 'normal' \| 'exception'` | Get Ant Design Progress status |
| `calculateMqttBridgeHealthScore()` | `heapUsed, heapTotal, rss, connected, status` | `number (0-100)` | Calculate MQTT health score |
| `calculateRAMHealthScore()` | `usedBytes, totalBytes` | `number (0-100)` | Calculate RAM health score |
| `calculateAlertHealthScore()` | `total, active, critical` | `number (0-100)` | Calculate alert health score |
| `calculateOverallSystemHealth()` | `deviceScore, alertScore, mqttScore, ramScore` | `number (0-100)` | Calculate weighted overall health |

---

## Support

For questions or issues related to health thresholds:

1. Check this documentation first
2. Review `config/healthThresholds.ts` for implementation details
3. Examine component usage examples in the updated files
4. Ensure you're importing from the correct path: `'../config'`

---

**Last Updated**: November 8, 2025  
**Version**: 1.0.0  
**Maintained by**: Capstone Final Project Team
