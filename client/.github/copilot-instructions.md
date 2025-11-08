# GitHub Copilot Instructions

## Project Architecture Overview

This project follows a strict **Service Layer → Global Hooks → UI** data flow architecture. Always adhere to these principles when generating or modifying code.

---

## Core Principles

### 1. Data Flow Pattern
```
Service Layer (services/*.Service.ts)
    ↓
Global Hooks Layer (hooks/reads/* OR hooks/writes/*)
    ↓
UI Layer (components/*, pages/*)
```

### 2. Component Structure (STRICT)

**One File = One Component Rule:**
- ✅ **MUST**: Each React component in its own file
- ✅ **MUST**: File name matches component name (PascalCase)
- ✅ **MUST**: Only ONE default export per component file
- ❌ **NEVER**: Multiple components in a single file
- ❌ **NEVER**: Helper components defined in the same file

**File Naming Convention:**
```
ComponentName.tsx  → export default ComponentName
```

**Example Structure:**
```
pages/admin/AdminDashboard/
  ├── AdminDashboard.tsx           (Main page component)
  ├── components/
  │   ├── DashboardHeader.tsx      (One component)
  │   ├── MetricsCard.tsx          (One component)
  │   ├── AlertsList.tsx           (One component)
  │   └── DeviceStatusChart.tsx    (One component)

```

**Why This Matters:**
- Better code organization and maintainability
- Easier to locate and update components
- Clearer component dependencies
- Improved reusability across the app
- Simplified testing and debugging

### 3. Separation of Concerns

**Service Layer (`services/*.Service.ts`):**
- Contains ALL SDK/API operations (Firestore, RTDB, Axios)
- Pure functions that return Promises
- NO React dependencies
- Handle error transformation and standardization
- Singleton exports: `alertsService`, `devicesService`, `usersService`, `reportsService`, `mqttService`
- Examples: `acknowledgeAlert()`, `createReport()`, `updateUserStatus()`

**Global Hooks Layer (CENTRALIZED):**
- **Read Hooks** (`hooks/reads/useRealtime_*.ts`):
  - Use Firebase/RTDB listeners for real-time data ONLY
  - Direct reads allowed for: device readings, alerts, live dashboards
  - Return: `{ data, isLoading, error, refetch }`
  - Never perform writes
  - Exported from `hooks/index.ts`

- **Write Hooks** (`hooks/writes/useCall_*.ts`):
  - Wrap service layer functions
  - Provide React-friendly interface with loading/error states
  - Return: `{ call functions, isLoading, error, isSuccess, operationType, reset }`
  - Handle UI state management
  - Exported from `hooks/index.ts`

**UI Layer (`components/*`, `pages/*`):**
- **✅ MUST use GLOBAL hooks from `@/hooks` or `../../hooks`**
- **❌ NEVER create local/page-specific hooks that duplicate global hooks**
- **❌ NEVER import service functions directly in UI components**
- Components should be "dumb" - accept data and callbacks from global hooks
- No direct Firebase/RTDB/Axios imports in UI components

---

## Strict Rules

### ✅ DO:
1. **One Component Per File (STRICT)**
   - Each React component in its own `.tsx` file
   - File name must match component name (PascalCase)
   - Only ONE default export per component file
   - Organize related components in `components/` subdirectory

2. **All CRUD operations via Service Layer**
   - Create, Update, Delete, Acknowledge, Edit permissions, Generate reports
   - Use function calls through service layer

3. **Realtime data via Direct Firestore/RTDB listeners**
   - Device readings, alerts, live metrics
   - Implement in `hooks/reads/useRealtime_*.ts`

4. **MQTT operations via Axios ONLY**
   - Bridge status, health metrics, MQTT-specific endpoints
   - Centralize in `services/mqtt.service.ts`

5. **ALL UI components MUST use GLOBAL hooks**
   - Import from `@/hooks` or `../../hooks/index.ts`
   - Reuse existing hooks: `useRealtime_Alerts`, `useRealtime_Devices`, `useCall_Alerts`, etc.
   - Check `hooks/index.ts` for available hooks before creating new ones

6. **Service Export Names (CRITICAL)**
   - `alertsService` ✅ (from `alerts.Service.ts`)
   - `devicesService` ✅ (from `devices.Service.ts`)
   - `usersService` ✅ (from `user.Service.ts`)
   - `reportsService` ✅ (from `reports.Service.ts`)
   - `mqttService` ✅ (from `mqtt.service.ts`)

### ❌ DON'T:
1. ❌ **Define multiple components in a single file**
2. ❌ **Create helper components in the same file as the main component**
3. ❌ Use Axios for Firestore/RTDB operations
4. ❌ Perform direct writes in UI components
5. ❌ Mix reads and writes in the same hook
6. ❌ Import Firebase SDK directly in UI components
7. ❌ Use service functions directly in components (use hooks instead)
8. ❌ **Create local/page-specific hooks that duplicate global hooks functionality**
9. ❌ Create hooks in `pages/**/hooks/` that wrap service layer (use global hooks)
10. ❌ Import services with wrong names (`deviceManagementService` ❌, `userManagementService` ❌)


---

## File Naming Conventions (STRICT)

### Service Layer Files:
```
✅ services/alerts.Service.ts       → Export: alertsService
✅ services/devices.Service.ts      → Export: devicesService
✅ services/user.Service.ts         → Export: usersService
✅ services/reports.Service.ts      → Export: reportsService
✅ services/mqtt.service.ts         → Export: mqttService
❌ services/alertService.ts         (Missing .Service suffix)
❌ services/alert.Service.ts        (Singular, should be plural)
```

### Global Read Hooks (Real-time data):
```
✅ hooks/reads/useRealtime_Alerts.ts       → Export: useRealtime_Alerts
✅ hooks/reads/useRealtime_Devices.ts      → Export: useRealtime_Devices
✅ hooks/reads/useRealtime_Users.ts        → Export: useRealtime_Users
✅ hooks/reads/useRealtime_MQTTMetrics.ts  → Export: useRealtime_MQTTMetrics
❌ hooks/reads/useRealtimeAlerts.ts        (Missing underscore)
❌ hooks/reads/useAlerts.ts                (Missing Realtime_ prefix)
```

### Global Write Hooks (CRUD operations):
```
✅ hooks/writes/useCall_Alerts.ts    → Export: useCall_Alerts
✅ hooks/writes/useCall_Devices.ts   → Export: useCall_Devices
✅ hooks/writes/useCall_Users.ts     → Export: useCall_Users
✅ hooks/writes/useCall_Reports.ts   → Export: useCall_Reports
❌ hooks/writes/useCallAlerts.ts     (Missing underscore)
❌ hooks/writes/useAlertsWrite.ts    (Wrong pattern)
```

### Schema Files:
```
✅ schemas/alerts.schema.ts              → Export types: Alert, CreateAlertInput
✅ schemas/deviceManagement.schema.ts    → Export types: Device, DeviceReading
✅ schemas/userManagement.schema.ts      → Export types: User, UserRole
✅ schemas/reports.schema.ts             → Export types: Report, ReportType
❌ schemas/alert.schema.ts               (Singular, should be plural)
❌ schemas/alertsSchema.ts               (Missing .schema suffix)
```

### Component Files (PascalCase):
```
✅ components/AlertNotificationCenter.tsx  → export default AlertNotificationCenter
✅ components/UserMenu.tsx                 → export default UserMenu
✅ pages/admin/AdminDashboard.tsx          → export default AdminDashboard
❌ components/alertNotificationCenter.tsx  (camelCase, use PascalCase)
❌ components/alert-notification-center.tsx (kebab-case, use PascalCase)
```

### Local UI Hooks (UI-specific logic only):
```
✅ pages/admin/AdminDashboard/hooks/useDashboardFilters.ts  (UI state)
✅ pages/admin/AdminAlerts/hooks/useAlertStats.ts           (Calculations)
✅ pages/staff/StaffDevices/hooks/useDeviceFilter.ts        (Filter logic)
❌ pages/admin/hooks/useDeviceCRUD.ts                       (Use global useCall_Devices)
❌ pages/staff/hooks/useRealtimeData.ts                     (Use global useRealtime_*)
```

**Pattern Summary:**
- Services: `[feature].Service.ts` (lowercase + .Service suffix)
- Global reads: `useRealtime_[Feature].ts` (underscore required)
- Global writes: `useCall_[Feature].ts` (underscore required)
- Schemas: `[feature].schema.ts` (lowercase + .schema suffix)
- Components: `ComponentName.tsx` (PascalCase)
- Local hooks: `use[Purpose].ts` (camelCase, UI logic only)

---

## Global Hooks Registry

### Available Global Read Hooks:
- `useRealtime_Alerts()` - Real-time alerts from Firestore
- `useRealtime_Devices()` - Real-time device sensor data from RTDB + Firestore
- `useRealtime_MQTTMetrics()` - MQTT Bridge health/status polling

### Available Global Write Hooks:
- `useCall_Alerts()` - Alert operations (acknowledge, resolve)
- `useCall_Devices()` - Device CRUD (add, update, delete, register)
- `useCall_Users()` - User management (update status, update role)
- `useCall_Reports()` - Report generation (water quality, device status, compliance)
- `useCall_Analytics()` - Analytics operations (deprecated, use Reports)

### Import Patterns (CRITICAL):

**Global Hooks (Always use these in UI components):**
```typescript
// ✅ CORRECT - Import from centralized hooks barrel file
import { useRealtime_Alerts, useCall_Alerts } from '@/hooks';
import { useRealtime_Devices, useCall_Devices } from '@/hooks';

// ✅ ALSO CORRECT - Direct import if barrel unavailable
import { useRealtime_Alerts } from '@/hooks/reads/useRealtime_Alerts';
import { useCall_Alerts } from '@/hooks/writes/useCall_Alerts';

// ❌ WRONG - Don't create local duplicates
import { useRealtimeAlerts } from './hooks/useRealtimeAlerts';
import { useAlertsData } from '../hooks/useAlertsData';
```

**Service Layer (Never import directly in UI components):**
```typescript
// ✅ CORRECT - Only import in global hooks (hooks/writes/*)
import { alertsService } from '@/services/alerts.Service';
import { devicesService } from '@/services/devices.Service';

// ❌ WRONG - Never import services in UI components
import { alertsService } from '@/services/alerts.Service'; // In component file
```

**Schemas (Import types anywhere needed):**
```typescript
// ✅ CORRECT - Import types from schemas
import type { Alert, AlertSeverity } from '@/schemas/alerts.schema';
import type { Device, DeviceStatus } from '@/schemas/deviceManagement.schema';

// ❌ WRONG - Defining types inline
type Alert = { id: string; message: string }; // Use schema types instead
```

---

## When Generating Code

1. **For CRUD operations**: 
   - Check if global write hook exists in `hooks/writes/`
   - Use existing hook: `useCall_Devices()`, `useCall_Users()`, etc.
   - If hook doesn't exist, create in `hooks/writes/` and export from `hooks/index.ts`

2. **For realtime data**: 
   - Check if global read hook exists in `hooks/reads/`
   - Use existing hook: `useRealtime_Alerts()`, `useRealtime_Devices()`, etc.
   - If hook doesn't exist, create in `hooks/reads/` and export from `hooks/index.ts`

3. **For MQTT operations**: 
   - Add to `services/mqtt.service.ts` → Use `useRealtime_MQTTMetrics()` global hook

4. **For UI-specific logic** (filters, pagination, form validation):
   - Create local hooks in `pages/**/hooks/` (e.g., `useDeviceFilter`, `useAlertStats`)
   - These should NOT wrap service layer calls

5. **Always** include TypeScript types from schemas
6. **Always** handle loading and error states
7. **Always** check `hooks/index.ts` before creating new hooks

---

## TypeScript Best Practices

- Import types from `schemas/*.schema.ts`
- Use `Partial<T>` for update operations
- Add `id: string` to all Firestore documents
- Use proper error typing: `Error | null`
- Return typed Promise from service functions


```

---

## Questions to Ask Before Generating Code

1. Is this a CRUD operation? → Use Service + Global Write Hook (`useCall_*`)
2. Is this realtime data? → Use Global Read Hook (`useRealtime_*`) with Firebase listener
3. Is this MQTT-related? → Use `useRealtime_MQTTMetrics()` global hook
4. Does the global hook already exist? → Check `hooks/index.ts` first!
5. Is this UI-specific logic (filters, pagination)? → Local hook is OK (but don't wrap service calls)
6. Does the service function exist? → Check `services/*.Service.ts`

---

## Service Layer → Hooks Mapping

### Services → Global Hooks:
```
alertsService (alerts.Service.ts)
  ├── useRealtime_Alerts() - READ: Subscribe to alerts
  └── useCall_Alerts() - WRITE: acknowledgeAlert(), resolveAlert()

devicesService (devices.Service.ts)
  ├── useRealtime_Devices() - READ: Subscribe to device sensor data
  └── useCall_Devices() - WRITE: addDevice(), updateDevice(), deleteDevice(), registerDevice()

usersService (user.Service.ts)
  └── useCall_Users() - WRITE: updateUserStatus(), updateUser()

reportsService (reports.Service.ts)
  └── useCall_Reports() - WRITE: generateWaterQualityReport(), generateDeviceStatusReport()

mqttService (mqtt.service.ts)
  └── useRealtime_MQTTMetrics() - READ: Poll MQTT Bridge health/status
```

---

## References

- Full architecture documentation: `docs/DATA_FLOW.md`
- Existing services: `src/services/`
- Existing global hooks: `src/hooks/`
- Schemas: `src/schemas/`

---

## Migration Notes for Existing Local Hooks

**Local hooks that SHOULD be replaced with global hooks:**
- ❌ `pages/admin/AdminDashboard/hooks/useRealtimeDevices.ts` → ✅ Use `useRealtime_Devices()`
- ❌ `pages/admin/AdminDashboard/hooks/useRealtimeAlerts.ts` → ✅ Use `useRealtime_Alerts()`
- ❌ Any local hook that wraps service layer calls → ✅ Use global hooks

**Local hooks that are OK (UI-specific logic):**
- ✅ `pages/admin/AdminDeviceManagement/hooks/useDeviceFilter.ts` - Filtering logic
- ✅ `pages/admin/AdminAlerts/hooks/useAlertStats.ts` - Statistics calculation
- ✅ `pages/admin/AdminAlerts/hooks/useAlertFilters.ts` - Filter state management

---

**Remember**: The goal is predictable data flow, clear separation of concerns, and maintainable code. When in doubt, follow the pattern: Service → Global Hook → UI.
