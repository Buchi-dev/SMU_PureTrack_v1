# Constants Usage Guide

## Import Pattern
```typescript
// Import specific constants
import { SENSOR_THRESHOLDS, ERROR_MESSAGES, USER_ROLES } from '@/constants';

// Or import individual files
import { WATER_QUALITY_PARAMETERS } from '@/constants/waterQuality.constants';
```

## Quick Reference

### 1. Water Quality (`waterQuality.constants.ts`)
```typescript
// Validate sensor value
const isValid = validateParameterValue('pH', 7.2);

// Get parameter display info
const phInfo = WATER_QUALITY_PARAMETERS.pH;
console.log(phInfo.name); // "Potential Hydrogen (pH)"
console.log(phInfo.unit); // "pH"

// Get severity color
const color = getSeverityColor('Critical'); // "#ff4d4f"

// Access thresholds
const phThresholds = SENSOR_THRESHOLDS.pH;
console.log(phThresholds.safe.min); // 6.5
```

### 2. Error Messages (`errorMessages.constants.ts`)
```typescript
// Use error messages
notification.error({
  message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
});

// Dynamic errors
const error = ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('Email');

// Parse unknown errors
const message = getErrorMessage(error);
```

### 3. Success Messages (`successMessages.constants.ts`)
```typescript
notification.success({
  message: SUCCESS_MESSAGES.ALERT.ACKNOWLEDGED,
});

notification.success({
  message: SUCCESS_MESSAGES.DEVICE.UPDATED,
});
```

### 4. API Configuration (`api.constants.ts`)
```typescript
// HTTP Status
if (response.status === HTTP_STATUS.UNAUTHORIZED) { ... }

// Timeouts
axios.get(url, { timeout: REQUEST_TIMEOUT.DEFAULT });

// SWR Configuration
const { data } = useSWR(key, fetcher, {
  refreshInterval: SWR_CONFIG.REFRESH_INTERVAL.FREQUENT,
});

// Pagination
const [pageSize, setPageSize] = useState(PAGINATION.DEFAULT_PAGE_SIZE);

// Cache keys
const { data: devices } = useSWR(CACHE_KEYS.DEVICE_LIST, fetcher);
```

### 5. Routes (`routes.constants.ts`)
```typescript
// Navigation
navigate(ADMIN_ROUTES.DASHBOARD);
navigate(ADMIN_ROUTES.USER_DETAIL('user-id-123'));

// Route checking
if (isAdminRoute(pathname)) { ... }
if (isProtectedRoute(pathname)) { ... }

// Redirect based on role
const redirectPath = getRedirectPath(user.role);

// Breadcrumbs
const breadcrumbs = getBreadcrumbs(pathname);
```

### 6. Roles & Permissions (`roles.constants.ts`)
```typescript
// Check permissions
if (hasPermission(user.role, PERMISSIONS.USER_DELETE)) { ... }
if (hasAnyPermission(user.role, [PERMISSIONS.DEVICE_UPDATE, PERMISSIONS.DEVICE_DELETE])) { ... }

// Role checks
if (isAdmin(user.role)) { ... }
if (isStaff(user.role)) { ... }

// Feature flags
if (isFeatureEnabled('USER_MANAGEMENT', user.role)) { ... }

// Display names
const roleName = getRoleDisplayName(user.role); // "Administrator"
const statusName = getStatusDisplayName(user.status); // "Active"
```

## Common Replacement Patterns

### Before (Hardcoded):
```typescript
if (pH < 6.5 || pH > 8.5) {
  notification.error({ message: 'pH out of range!' });
}
```

### After (Using Constants):
```typescript
import { validateParameterValue, ERROR_MESSAGES } from '@/constants';

if (!validateParameterValue('pH', pH)) {
  notification.error({ message: ERROR_MESSAGES.SENSOR.OUT_OF_RANGE('pH') });
}
```

### Before (Magic Numbers):
```typescript
const { data } = useSWR(url, fetcher, { refreshInterval: 30000 });
```

### After (Using Constants):
```typescript
import { SWR_CONFIG } from '@/constants';

const { data } = useSWR(url, fetcher, {
  refreshInterval: SWR_CONFIG.REFRESH_INTERVAL.FREQUENT,
});
```

## Next Steps

### Phase 1: Update Schemas
- `alerts.schema.ts`: Use `ALERT_STATUS`, `ALERT_SEVERITY`
- `deviceManagement.schema.ts`: Use `SENSOR_THRESHOLDS` for validation
- Replace min/max hardcoded values

### Phase 2: Update Services
- Replace hardcoded error messages with `ERROR_MESSAGES`
- Replace success messages with `SUCCESS_MESSAGES`
- Use `REQUEST_TIMEOUT` for axios config

### Phase 3: Update Components
- Replace hardcoded routes with `ROUTES` constants
- Use `WATER_QUALITY_PARAMETERS` for display info
- Replace permission checks with `hasPermission()`

### Phase 4: Update Hooks
- Use `SWR_CONFIG` for refresh intervals
- Use `CACHE_KEYS` for SWR keys
- Replace hardcoded timeouts

## TypeScript Benefits

All constants are strongly typed:
```typescript
// Autocomplete and type safety
const role: UserRole = USER_ROLES.ADMIN; // ✅
const role: UserRole = "InvalidRole"; // ❌ Type error

// Function signatures enforce correct usage
hasPermission(user.role, PERMISSIONS.USER_DELETE); // ✅
hasPermission(user.role, "invalid-permission"); // ❌ Type error
```
