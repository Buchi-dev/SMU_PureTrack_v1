# 📊 Staff Dashboard Documentation

Complete guide for the Staff Dashboard system with routing and layouts.

---

## 🎯 Overview

The Staff Dashboard provides a dedicated interface for staff members to monitor water quality devices and sensor data. It features:

- **Role-Based Access**: Separate interface for Staff users (non-admin)
- **Real-Time Monitoring**: Live device status and sensor readings
- **Analytics Dashboard**: Charts and trends for water quality data
- **Responsive Design**: Works on desktop, tablet, and mobile devices

---

## 📁 File Structure

```
client/src/
├── components/
│   ├── layouts/
│   │   ├── StaffLayout.tsx         # Staff portal layout
│   │   └── AdminLayout.tsx         # Admin panel layout
│   ├── RootRedirect.tsx            # Smart role-based redirect
│   └── ProtectedRoute.tsx          # Route protection
├── pages/
│   └── staff/
│       ├── StaffDashboard.tsx      # Main dashboard
│       ├── StaffDevices.tsx        # Device listing
│       ├── StaffReadings.tsx       # Sensor readings
│       ├── StaffAnalytics.tsx      # Charts & analytics
│       └── index.ts                # Exports
└── router/
    └── index.tsx                   # Route configuration
```

---

## 🚀 Features

### 1. Staff Dashboard (`/staff/dashboard`)

**Purpose**: Main landing page for staff members

**Features**:
- ✅ Overview statistics (total devices, online, warnings, offline)
- ✅ Real-time device status table
- ✅ Recent alerts section
- ✅ Quick action buttons
- ✅ Progress indicators for device health

**Key Components**:
```tsx
<StaffDashboard />
├── Statistics Cards (4)
├── Active Alerts Banner
├── Recent Alerts Table
├── Device Status Table
└── Quick Actions
```

**Data Displayed**:
- Total devices count
- Online/Offline status
- Warning devices
- Recent sensor readings (pH, Temperature, Turbidity)
- Alert severity levels
- Last update timestamps

---

### 2. Staff Devices (`/staff/devices`)

**Purpose**: View all monitoring devices

**Features**:
- ✅ Device listing with status
- ✅ Search by name/location
- ✅ Filter by status (Online/Warning/Offline)
- ✅ Device statistics
- ✅ Sensor configuration display
- ✅ Uptime percentage

**Key Components**:
```tsx
<StaffDevices />
├── Statistics Cards
├── Search & Filter Bar
└── Devices Table
    ├── Device Name & ID
    ├── Location
    ├── Status Badge
    ├── Sensor List
    ├── Uptime
    └── View Action
```

**Filter Options**:
- All Devices
- Online only
- Warning only
- Offline only

---

### 3. Staff Readings (`/staff/readings`)

**Purpose**: View sensor data and measurements

**Features**:
- ✅ Real-time sensor readings table
- ✅ Parameter color coding (Normal/Warning/Critical)
- ✅ Filter by device
- ✅ Filter by status
- ✅ Date range picker
- ✅ Export data functionality
- ✅ Parameter reference ranges
- ✅ Critical alerts banner

**Key Components**:
```tsx
<StaffReadings />
├── Critical Alerts Banner
├── Statistics Cards
├── Filter Controls
│   ├── Device Filter
│   ├── Status Filter
│   ├── Date Range Picker
│   └── Export Button
├── Parameter Reference Card
└── Readings Table
    ├── Timestamp
    ├── Device & Location
    ├── pH Level (colored)
    ├── Temperature (colored)
    ├── Turbidity (colored)
    ├── Dissolved Oxygen (colored)
    └── Status Badge
```

**Parameter Ranges**:
| Parameter | Normal Range | Warning Range |
|-----------|-------------|---------------|
| pH | 6.5 - 8.5 | < 6.5 or > 8.5 |
| Temperature | 20 - 30 °C | < 20 or > 30 |
| Turbidity | 0 - 5 NTU | > 5 |
| Dissolved Oxygen | 5 - 10 mg/L | < 5 or > 10 |

---

### 4. Staff Analytics (`/staff/analytics`)

**Purpose**: View trends and charts

**Features**:
- ✅ Summary statistics
- ✅ pH trend chart (24 hours)
- ✅ Temperature trend chart (24 hours)
- ✅ Device comparison bar chart
- ✅ Water quality status
- ✅ System performance metrics

**Key Components**:
```tsx
<StaffAnalytics />
├── Summary Statistics (4 cards)
├── pH Trend Chart (Line)
├── Temperature Trend Chart (Line)
├── Device Comparison Chart (Bar)
├── Water Quality Status Card
└── System Performance Card
```

**Charts Included**:
1. **pH Level Trend**: 24-hour line chart
2. **Temperature Trend**: 24-hour line chart
3. **Device Comparison**: Multi-parameter bar chart

---

## 🎨 Staff Layout

### Layout Structure

```tsx
<StaffLayout>
  <Sider>
    - Logo: "Staff Portal"
    - Menu:
      • Dashboard
      • View Devices
      • Sensor Data
      • Analytics
  </Sider>
  <Layout>
    <Header>
      - Toggle Button
      - Notifications (Badge)
      - UserMenu
    </Header>
    <Content>
      {children}
    </Content>
    <Footer>
      "Staff Portal © 2025"
    </Footer>
  </Layout>
</StaffLayout>
```

### Menu Items

| Icon | Label | Route |
|------|-------|-------|
| 📊 | Dashboard | `/staff/dashboard` |
| 🔌 | View Devices | `/staff/devices` |
| 📈 | Sensor Data | `/staff/readings` |
| 📉 | Analytics | `/staff/analytics` |

---

## 🛡️ Route Protection

### Staff Routes Configuration

```tsx
// All staff routes use ApprovedRoute
// Both Admin and Staff roles can access

{
  path: '/staff/dashboard',
  element: (
    <ApprovedRoute>
      <StaffDashboard />
    </ApprovedRoute>
  ),
}
```

### Access Rules

| Route | Admin | Staff | Not Approved |
|-------|-------|-------|--------------|
| `/staff/dashboard` | ✅ | ✅ | ❌ |
| `/staff/devices` | ✅ | ✅ | ❌ |
| `/staff/readings` | ✅ | ✅ | ❌ |
| `/staff/analytics` | ✅ | ✅ | ❌ |
| `/admin/*` | ✅ | ❌ | ❌ |

---

## 🔄 Smart Root Redirect

### RootRedirect Component

Automatically redirects users based on authentication status and role:

```tsx
<RootRedirect />
```

**Redirect Logic**:
1. **Not Authenticated** → `/auth/login`
2. **Authenticated but Pending** → `/auth/pending-approval`
3. **Admin (Approved)** → `/admin/dashboard`
4. **Staff (Approved)** → `/staff/dashboard`

---

## 🎯 Usage Examples

### Navigation from Code

```tsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../router';

const navigate = useNavigate();

// Navigate to staff dashboard
navigate(ROUTES.STAFF.DASHBOARD);

// Navigate to specific device
navigate(`/staff/devices/${deviceId}/readings`);

// Navigate to readings
navigate(ROUTES.STAFF.READINGS);
```

### Access User Context

```tsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { 
    userProfile, 
    isAdmin, 
    isStaff, 
    isApproved 
  } = useAuth();

  return (
    <div>
      Welcome, {userProfile?.firstname}!
      Role: {isAdmin ? 'Admin' : 'Staff'}
    </div>
  );
};
```

---

## 📊 Data Flow

### 1. Dashboard Load
```
User → Route → ApprovedRoute (Check Auth)
       ↓
StaffDashboard → useEffect (Fetch Data)
       ↓
Firebase/API → Mock Data (for now)
       ↓
State Update → UI Render
```

### 2. Real-Time Updates
```
Firebase Realtime DB → onSnapshot Listener
       ↓
State Update → Table Re-render
       ↓
New Data Displayed
```

---

## 🎨 Design Tokens

### Colors Used

```tsx
// Status Colors
success: '#52c41a'   // Green - Normal/Online
warning: '#faad14'   // Orange - Warning
error: '#ff4d4f'     // Red - Critical/Offline
info: '#1890ff'      // Blue - Information

// Chart Colors
ph: '#52c41a'        // Green
temperature: '#1890ff' // Blue
turbidity: '#faad14' // Orange
```

### Typography

```tsx
Title level={2}      // Page headers
Text strong          // Labels
Text type="secondary" // Descriptions
```

---

## 🔧 Customization

### Add New Menu Item

```tsx
// In StaffLayout.tsx
const menuItems: MenuProps['items'] = [
  // ... existing items
  {
    key: 'reports',
    icon: <FileTextOutlined />,
    label: 'Reports',
  },
];

// Add route mapping
const routeMap: Record<string, string> = {
  // ... existing routes
  reports: ROUTES.STAFF.REPORTS,
};
```

### Add New Page

1. **Create Page Component**:
```tsx
// src/pages/staff/StaffReports.tsx
export const StaffReports = () => {
  return (
    <StaffLayout>
      <Title>Reports</Title>
      {/* Your content */}
    </StaffLayout>
  );
};
```

2. **Export from Index**:
```tsx
// src/pages/staff/index.ts
export { StaffReports } from './StaffReports';
```

3. **Add Route**:
```tsx
// src/router/index.tsx
{
  path: '/staff/reports',
  element: (
    <ApprovedRoute>
      <StaffReports />
    </ApprovedRoute>
  ),
}
```

4. **Update ROUTES constant**:
```tsx
export const ROUTES = {
  STAFF: {
    // ... existing routes
    REPORTS: '/staff/reports',
  },
};
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Login as Staff user**
  - [ ] Should redirect to `/staff/dashboard`
  - [ ] Should see 4 statistics cards
  - [ ] Should see device status table
  
- [ ] **Navigation**
  - [ ] Click "View Devices" → Should go to `/staff/devices`
  - [ ] Click "Sensor Data" → Should go to `/staff/readings`
  - [ ] Click "Analytics" → Should go to `/staff/analytics`
  
- [ ] **Device List**
  - [ ] Search should filter devices
  - [ ] Status filter should work
  - [ ] "View" button should show readings
  
- [ ] **Readings Page**
  - [ ] Device filter should work
  - [ ] Status filter should work
  - [ ] Date range picker should appear
  - [ ] Color coding should be correct
  
- [ ] **Analytics Page**
  - [ ] Charts should render
  - [ ] Data should be visible
  - [ ] Stats should be accurate

- [ ] **Layout**
  - [ ] Sidebar should collapse/expand
  - [ ] UserMenu should show profile
  - [ ] Logout should work
  - [ ] Notifications badge should show

- [ ] **Responsive Design**
  - [ ] Test on mobile (< 768px)
  - [ ] Test on tablet (768-1024px)
  - [ ] Test on desktop (> 1024px)

---

## 🚨 Troubleshooting

### Issue: Staff user redirected to admin panel
**Solution**: Check `RootRedirect` logic and ensure `isAdmin` check is correct

### Issue: Charts not rendering
**Solution**: 
1. Verify recharts is installed: `npm list recharts`
2. Check console for errors
3. Ensure data format matches chart requirements

### Issue: Filters not working
**Solution**: Check `filteredReadings` logic and state updates

### Issue: Routes return 404
**Solution**: 
1. Verify route is defined in `router/index.tsx`
2. Check path spelling
3. Ensure component is imported

---

## 📈 Performance Tips

1. **Lazy Load Charts**:
```tsx
const Analytics = lazy(() => import('./StaffAnalytics'));
```

2. **Memo Components**:
```tsx
const DeviceTable = memo(({ data }) => {
  // ... component
});
```

3. **Pagination**:
```tsx
<Table
  pagination={{ pageSize: 20 }}
  dataSource={data}
/>
```

4. **Debounce Search**:
```tsx
const debouncedSearch = useMemo(
  () => debounce((value) => setSearch(value), 300),
  []
);
```

---

## 🎯 Next Steps

### Immediate
- [ ] Connect to real Firebase data
- [ ] Implement real-time listeners
- [ ] Add error boundaries
- [ ] Add loading states

### Future Enhancements
- [ ] Export to PDF/Excel
- [ ] Custom date ranges
- [ ] Alert notifications
- [ ] Device favorites
- [ ] Dark mode toggle
- [ ] Print reports
- [ ] Email alerts
- [ ] Mobile app

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review route configuration in `router/index.tsx`
3. Check AuthContext for authentication issues
4. Review console logs for errors

---

**Version**: 1.0.0  
**Last Updated**: January 21, 2025  
**Status**: ✅ Complete

---

Made with ❤️ for water quality monitoring
