# 📋 Staff Dashboard - Quick Reference Card

One-page reference for the Staff Dashboard system.

---

## 🚀 Start Development

```bash
cd client
npm run dev
```
Visit: `http://localhost:5173`

---

## 📍 Routes

| URL | Page | Access |
|-----|------|--------|
| `/staff/dashboard` | Overview | Staff + Admin |
| `/staff/devices` | Device List | Staff + Admin |
| `/staff/readings` | Sensor Data | Staff + Admin |
| `/staff/analytics` | Charts | Staff + Admin |
| `/admin/*` | Admin Panel | Admin Only |

---

## 🎨 Components

### Layout
```tsx
import { StaffLayout } from '../components/layouts/StaffLayout';

<StaffLayout>
  {/* Your content */}
</StaffLayout>
```

### Navigation
```tsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../router';

const navigate = useNavigate();
navigate(ROUTES.STAFF.DASHBOARD);
```

### Auth Context
```tsx
import { useAuth } from '../contexts/AuthContext';

const { userProfile, isAdmin, isStaff } = useAuth();
```

---

## 🎯 Features by Page

### Dashboard
- ✅ 4 statistics cards
- ✅ Active alerts
- ✅ Device status table
- ✅ Quick actions

### Devices
- ✅ Device listing
- ✅ Search & filter
- ✅ Status badges
- ✅ Uptime display

### Readings
- ✅ Sensor readings
- ✅ Color coding
- ✅ Filters
- ✅ Reference ranges

### Analytics
- ✅ pH trend chart
- ✅ Temp trend chart
- ✅ Device comparison
- ✅ Summary stats

---

## 🎨 Color System

```tsx
// Status Colors
Online:   '#52c41a' // Green
Warning:  '#faad14' // Orange
Critical: '#ff4d4f' // Red
Offline:  '#8c8c8c' // Gray
Info:     '#1890ff' // Blue
```

---

## 📊 Mock Data Structure

### Device
```tsx
{
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  ph: number;
  temperature: number;
  turbidity: number;
}
```

### Reading
```tsx
{
  timestamp: string;
  device: string;
  ph: number;
  temperature: number;
  turbidity: number;
  dissolvedOxygen: number;
  status: 'normal' | 'warning' | 'critical';
}
```

---

## 🛡️ Access Control

### Check Role
```tsx
const { isAdmin, isStaff, isApproved } = useAuth();

if (isAdmin) {
  // Admin access
}

if (isStaff && isApproved) {
  // Staff access
}
```

### Protected Route
```tsx
import { ApprovedRoute } from '../components/ProtectedRoute';

<ApprovedRoute>
  <StaffDashboard />
</ApprovedRoute>
```

---

## 🎯 Common Tasks

### Add New Page
1. Create component in `pages/staff/`
2. Export from `pages/staff/index.ts`
3. Add route in `router/index.tsx`
4. Update `ROUTES` constant
5. Add menu item in `StaffLayout.tsx`

### Add Menu Item
```tsx
// In StaffLayout.tsx
{
  key: 'reports',
  icon: <FileTextOutlined />,
  label: 'Reports',
}
```

### Navigate Programmatically
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Go to dashboard
navigate('/staff/dashboard');

// Go to device details
navigate(`/staff/devices/${deviceId}/readings`);

// Go back
navigate(-1);
```

---

## 🔍 Debugging

### Check Auth State
```tsx
console.log('User:', userProfile);
console.log('Is Admin:', isAdmin);
console.log('Is Staff:', isStaff);
console.log('Is Approved:', isApproved);
```

### Check Route
```tsx
import { useLocation } from 'react-router-dom';

const location = useLocation();
console.log('Current path:', location.pathname);
```

### Check Firestore
```
Firebase Console → Firestore → users → [user-id]
Check: status, role fields
```

---

## 🚨 Common Issues

### Issue: Can't Access Dashboard
**Fix**: Check Firestore
```
status: "Approved"
role: "Staff" or "Admin"
```

### Issue: Redirected to Login
**Fix**: Sign out and sign in again

### Issue: Charts Not Showing
**Fix**: Install recharts
```bash
npm install recharts
```

### Issue: 404 Error
**Fix**: Check route spelling and restart dev server

---

## 📦 Dependencies

```json
{
  "react": "^19.1.1",
  "react-router-dom": "^7.9.4",
  "antd": "^5.27.5",
  "recharts": "^2.x.x",
  "dayjs": "^1.11.18",
  "firebase": "^12.4.0"
}
```

---

## 📚 Documentation Files

1. **STAFF_DASHBOARD_COMPLETE.md** - Start here
2. **STAFF_DASHBOARD_QUICK_START.md** - 5-min setup
3. **STAFF_DASHBOARD_DOCUMENTATION.md** - Full guide
4. **STAFF_DASHBOARD_VISUAL_GUIDE.md** - UI diagrams
5. **STAFF_DASHBOARD_SUMMARY.md** - Implementation

---

## 🎨 Ant Design Components Used

- `Layout`, `Sider`, `Header`, `Content`, `Footer`
- `Menu`, `Button`, `Badge`, `Dropdown`
- `Table`, `Card`, `Statistic`, `Tag`
- `Space`, `Row`, `Col`, `Typography`
- `Input`, `Select`, `DatePicker`
- `Alert`, `Spin`, `Progress`

---

## 📐 Layout Dimensions

```tsx
// Sidebar
Expanded:  200px
Collapsed: 80px

// Header
Height:    64px

// Content
Padding:   24px
Margin:    24px 16px

// Breakpoints
Mobile:    < 768px
Tablet:    768px - 1024px
Desktop:   > 1024px
```

---

## 🎯 Parameter Ranges

| Parameter | Unit | Normal | Warning |
|-----------|------|--------|---------|
| pH | - | 6.5-8.5 | <6.5, >8.5 |
| Temperature | °C | 20-30 | <20, >30 |
| Turbidity | NTU | 0-5 | >5 |
| Dissolved O₂ | mg/L | 5-10 | <5, >10 |

---

## 🔗 Quick Links

### Code
- Layout: `client/src/components/layouts/StaffLayout.tsx`
- Pages: `client/src/pages/staff/`
- Router: `client/src/router/index.tsx`
- Context: `client/src/contexts/AuthContext.tsx`

### External
- Ant Design: https://ant.design
- Recharts: https://recharts.org
- React Router: https://reactrouter.com
- Firebase: https://firebase.google.com

---

## 💡 Tips

1. **Use ROUTES constant** for navigation
2. **Check useAuth** before rendering
3. **Wrap with StaffLayout** for consistency
4. **Use Ant Design** components
5. **Follow color system** for consistency

---

## 📞 Support

1. Check documentation files
2. Review console errors
3. Verify Firestore data
4. Check route configuration
5. Restart dev server

---

**Quick Reference v1.0**  
**Last Updated**: January 21, 2025

---

Keep this card handy while developing! 📋✨
