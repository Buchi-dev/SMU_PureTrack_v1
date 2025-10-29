# Staff Settings Analysis & Implementation

## Analysis Summary

I analyzed how **Admin Settings** is implemented and successfully applied the same pattern to **Staff Settings**.

### Admin Settings Structure

**Files Analyzed:**
- `AdminSettings.tsx` - Main page wrapper
- `NotificationSettings.tsx` - Feature component with form and notification preferences

**Key Characteristics:**
1. **Layout Wrapper**: Uses `AdminLayout` component from layouts
2. **Page Header**: 
   - Icon + Title: "Notification Settings"
   - Description: "Manage your notification preferences and alerts..."
   - Styled with consistent spacing (marginBottom: 32px)

3. **Content Structure**:
   - Wrapped in centered container with maxWidth: 1400px
   - Horizontal padding: 24px

4. **NotificationSettings Component**:
   - **State Management**: Uses Ant Design Form hooks
   - **Data Flow**: Fetches from Cloud Functions API
   - **Features**:
     - Notification Channels (Email & Push toggles)
     - Quiet Hours (Time range picker)
     - Alert Filters (Severity, Parameters, Devices)
     - Device list loading from API
     - User preferences persistence

### Implementation Pattern Applied to Staff Settings

---

## Files Created/Modified

### 1. **StaffSettings.tsx** (NEW)
```
Location: src/pages/staff/StaffSettings/StaffSettings.tsx
```

**Structure:**
- Uses `StaffLayout` component (staff-specific layout wrapper)
- Identical page header structure to AdminSettings
- Renders `NotificationSettings` component
- Maintains consistent styling and spacing

**Code:**
```tsx
import { StaffLayout } from '../../../components/layouts';
import { Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NotificationSettings from './NotificationSettings';

const { Title, Paragraph } = Typography;

export const StaffSettings = () => {
  return (
    <StaffLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BellOutlined style={{ color: '#1890ff' }} />
            Notification Settings
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 0 }}>
            Manage your notification preferences and alerts for water quality monitoring
          </Paragraph>
        </div>
        <NotificationSettings />
      </div>
    </StaffLayout>
  );
};
```

### 2. **NotificationSettings.tsx** (NEW)
```
Location: src/pages/staff/StaffSettings/NotificationSettings.tsx
```

**Identical to Admin version with same features:**
- Notification Channels (Email/Push toggles)
- Quiet Hours configuration
- Alert Filters (Severity, Parameters, Devices)
- Form validation and submission
- Cloud Functions API integration
- Loading and error states

**Key Components Used:**
- `Card` - Container for each section
- `Form` - Form management
- `Switch` - Toggle switches
- `Select` - Multi-select dropdowns
- `TimePicker.RangePicker` - Time range selection
- `Alert` - Status and info messages
- `Button` - Action buttons (Save, Reset)
- `Space`, `Row`, `Col` - Layout components

**Icons Used:**
- `BellOutlined` - Notifications header
- `MailOutlined` - Email channel
- `MobileOutlined` - Push notifications
- `ClockCircleOutlined` - Quiet hours
- `ThunderboltOutlined` - Alert severity
- `ExperimentOutlined` - Parameters
- `ApiOutlined` - Devices
- `SaveOutlined` - Save button

---

## Router Configuration Updates

### File: `src/router/index.tsx`

**Changes Made:**

1. **Added Import:**
```tsx
import { 
  StaffDashboard, 
  StaffDevices, 
  StaffReadings, 
  StaffAnalytics,
  StaffSettings  // ← NEW
} from '../pages/staff';
```

2. **Added Route:**
```tsx
{
  path: '/staff/settings',
  element: (
    <ApprovedRoute>
      <StaffSettings />
    </ApprovedRoute>
  ),
},
```

3. **Updated ROUTES Constant:**
```tsx
STAFF: {
  BASE: '/staff',
  DASHBOARD: '/staff/dashboard',
  DEVICES: '/staff/devices',
  READINGS: '/staff/readings',
  ANALYTICS: '/staff/analytics',
  SETTINGS: '/staff/settings',  // ← NEW
},
```

---

## Layout Integration

### File: `src/components/layouts/StaffLayout.tsx`

**Changes Made:**

1. **Added Icon Import:**
```tsx
import {
  DashboardOutlined,
  BarChartOutlined,
  ApiOutlined,
  LineChartOutlined,
  HomeOutlined,
  SettingOutlined,  // ← NEW
} from '@ant-design/icons';
```

2. **Updated Route Detection:**
```tsx
useEffect(() => {
  const path = location.pathname;
  if (path.includes('/staff/devices')) {
    setSelectedKeys(['devices']);
  } else if (path.includes('/staff/readings')) {
    setSelectedKeys(['readings']);
  } else if (path.includes('/staff/analytics')) {
    setSelectedKeys(['analytics']);
  } else if (path.includes('/staff/settings')) {
    setSelectedKeys(['settings']);  // ← NEW
  } else if (path.includes('/staff/dashboard')) {
    setSelectedKeys(['dashboard']);
  }
}, [location.pathname]);
```

3. **Added Menu Item:**
```tsx
const menuItems: MenuProps['items'] = [
  // ... existing items
  {
    key: 'settings',
    icon: <SettingOutlined style={{ fontSize: '16px' }} />,
    label: 'Settings',
  },
];
```

4. **Updated Route Mapping:**
```tsx
const handleMenuClick: MenuProps['onClick'] = (e) => {
  const routeMap: Record<string, string> = {
    dashboard: ROUTES.STAFF.DASHBOARD,
    devices: ROUTES.STAFF.DEVICES,
    readings: ROUTES.STAFF.READINGS,
    analytics: ROUTES.STAFF.ANALYTICS,
    settings: ROUTES.STAFF.SETTINGS,  // ← NEW
  };
  // ...
};
```

5. **Updated Breadcrumb:**
```tsx
const getBreadcrumbItems = () => {
  // ... existing conditions
  } else if (path.includes('/staff/settings')) {
    items.push({ title: 'Settings' });  // ← NEW
  } else if (path.includes('/staff/dashboard')) {
  // ...
};
```

---

## Exports Updated

### File: `src/pages/staff/index.ts`

**Added Export:**
```tsx
export { StaffSettings } from './StaffSettings/StaffSettings';
```

---

## Feature Comparison: Admin vs Staff Settings

| Feature | Admin | Staff |
|---------|-------|-------|
| **Layout** | AdminLayout | StaffLayout |
| **Page Title** | Same | Same |
| **Icon** | BellOutlined | BellOutlined |
| **Notification Channels** | Email + Push | Email + Push |
| **Quiet Hours** | Configurable | Configurable |
| **Alert Filters** | Severity, Parameters, Devices | Severity, Parameters, Devices |
| **Daily Reports** | 6:00 AM Manila Time | 6:00 AM Manila Time |
| **API Integration** | Cloud Functions | Cloud Functions |
| **Form Validation** | Yes | Yes |
| **User Preferences** | Per user (Cloud Functions) | Per user (Cloud Functions) |

---

## API Endpoints Used

Both implementations use the same Cloud Functions endpoints:

1. **`listNotificationPreferences`**
   - Method: GET
   - Purpose: Fetch user's current notification preferences
   - Returns: User preferences object

2. **`setupNotificationPreferences`**
   - Method: POST
   - Purpose: Save/update notification preferences
   - Request Body: Preferences object with all settings

3. **`deviceManagement`**
   - Method: POST
   - Action: LIST_DEVICES
   - Purpose: Fetch available devices for the filter dropdown
   - Returns: Array of device objects

---

## User Flow

```
Staff User
    ↓
Navigation Menu (Settings)
    ↓
/staff/settings route
    ↓
StaffSettings component
    ↓
NotificationSettings component
    ↓
Cloud Functions API
    ↓
Firebase Backend (Notification Preferences Collection)
    ↓
User Preferences Loaded/Saved
```

---

## Testing Verification

✅ **Build Status:** Successfully built with `npm run build`
- No TypeScript errors
- All modules resolved correctly
- Production bundle generated

✅ **Component Files:**
- `StaffSettings.tsx` - No errors
- `NotificationSettings.tsx` - No errors
- `StaffLayout.tsx` - No errors (SettingOutlined icon utilized)
- `router/index.tsx` - No errors

✅ **Exports:**
- `staff/index.ts` - Updated with StaffSettings export

---

## Summary

The Staff Settings implementation follows the exact same pattern as Admin Settings:

1. **Main Page Component** (`StaffSettings.tsx`)
   - Uses staff-specific layout wrapper
   - Provides consistent page header
   - Renders feature component

2. **Feature Component** (`NotificationSettings.tsx`)
   - Handles all notification preference logic
   - Form management and validation
   - API integration
   - State management

3. **Navigation Integration**
   - Added to StaffLayout menu with gear icon
   - Integrated into router with ApprovedRoute protection
   - Added breadcrumb support
   - Exported in staff pages index

4. **Consistency**
   - Same visual design and layout
   - Identical functionality
   - Same API endpoints
   - Same user experience

This ensures staff users have access to the same notification management capabilities as admin users, maintaining feature parity across the application.
