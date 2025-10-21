# 🚀 Staff Dashboard Quick Start

Get up and running with the Staff Dashboard in 5 minutes!

---

## ✅ Prerequisites

- Node.js 18+ installed
- Firebase project configured
- Authentication system working
- Client dependencies installed

---

## 🏃 Quick Start

### 1. Verify Installation

```bash
cd client
npm list recharts dayjs
```

**Expected output**:
```
recharts@2.x.x
dayjs@1.11.18
```

If missing:
```bash
npm install recharts dayjs
```

---

### 2. Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:5173`

---

### 3. Test Staff Dashboard

#### Test as Staff User

1. **Login**:
   - Go to `http://localhost:5173/auth/login`
   - Sign in with Google
   - Complete profile

2. **Admin Approval**:
   ```
   Firebase Console → Firestore → users → [your-user]
   
   Set:
   - status: "Approved"
   - role: "Staff"
   ```

3. **Access Dashboard**:
   - Should auto-redirect to `/staff/dashboard`
   - See 4 statistics cards
   - See device status table
   - See recent alerts

#### Test as Admin User

1. **Set Admin Role**:
   ```
   Firebase Console → Firestore → users → [your-user]
   
   Set:
   - role: "Admin"
   ```

2. **Login**:
   - Should redirect to `/admin/dashboard`
   - Admin panel should load

3. **Access Staff Dashboard** (Admin can access both):
   - Manually navigate to `/staff/dashboard`
   - Should work (ApprovedRoute allows both roles)

---

## 🎯 Feature Testing

### Dashboard (`/staff/dashboard`)

✅ **Statistics Cards**:
- Total Devices: 4
- Online: 3
- Warnings: 1
- Offline: 1

✅ **Device Status Table**:
- Shows 4 devices
- Color-coded status badges
- pH, Temperature, Turbidity values
- "View Details" button

✅ **Recent Alerts**:
- Shows 3 alerts
- Severity tags (high/medium/low)
- Parameter values

✅ **Quick Actions**:
- 4 action buttons
- All functional

---

### Devices (`/staff/devices`)

✅ **Search**:
```
1. Type "Device A" → Should filter to 1 device
2. Type "North" → Should filter by location
3. Clear → Should show all devices
```

✅ **Status Filter**:
```
1. Select "Online" → Should show 3 devices
2. Select "Warning" → Should show 1 device
3. Select "Offline" → Should show 1 device
4. Select "All" → Should show 5 devices
```

✅ **Device Table**:
- Shows device name, ID, location
- Status badges (Online/Warning/Offline)
- Sensor tags (pH, Temperature, etc.)
- Uptime percentage
- "View" button

---

### Readings (`/staff/readings`)

✅ **Filters**:
```
Device: Dropdown with all devices
Status: Normal/Warning/Critical
Date Range: Date picker (24 hours)
Export: Button (placeholder)
```

✅ **Color Coding**:
- **Green**: Parameter in normal range
- **Orange**: Parameter in warning range
- **Red**: Parameter in critical range

✅ **Parameter Ranges**:
| Parameter | Normal | Warning/Critical |
|-----------|--------|------------------|
| pH | 6.5-8.5 | < 6.5 or > 8.5 |
| Temperature | 20-30°C | < 20 or > 30 |
| Turbidity | 0-5 NTU | > 5 |
| DO | 5-10 mg/L | < 5 or > 10 |

✅ **Critical Alerts Banner**:
- Shows when critical readings exist
- Red alert box with warning icon

---

### Analytics (`/staff/analytics`)

✅ **Charts**:
1. **pH Trend Chart**:
   - Line chart showing 24-hour pH trend
   - X-axis: Time (00:00 - 24:00)
   - Y-axis: pH (6-9 range)

2. **Temperature Trend Chart**:
   - Line chart showing 24-hour temperature
   - X-axis: Time
   - Y-axis: Temperature (20-30°C)

3. **Device Comparison Chart**:
   - Bar chart comparing all devices
   - Shows pH, Temperature, Turbidity
   - Color-coded bars

✅ **Statistics**:
- Average pH (last 24h)
- Average Temperature (last 24h)
- Average Turbidity (last 24h)
- Total data points

✅ **Info Cards**:
- Water Quality Status
- System Performance

---

## 🎨 Layout Testing

### Sidebar

✅ **Logo**:
- Shows "Staff Portal" when expanded
- Shows "SP" when collapsed

✅ **Menu Items** (4 total):
- 📊 Dashboard
- 🔌 View Devices
- 📈 Sensor Data
- 📉 Analytics

✅ **Responsive**:
- Desktop: Fixed sidebar, always visible
- Tablet/Mobile: Collapsible sidebar

---

### Header

✅ **Toggle Button**:
- Click → Sidebar collapses/expands
- Icon changes (fold/unfold)

✅ **Notifications**:
- Badge showing count (3)
- Bell icon button

✅ **User Menu**:
- Avatar with initials
- Name and role
- Status badge
- Settings link
- Sign out button

---

### Footer

✅ **Text**:
```
Staff Portal ©2025 • Water Quality Monitoring System
```

---

## 🔄 Navigation Testing

### Menu Navigation

```bash
Click "Dashboard" → /staff/dashboard ✅
Click "View Devices" → /staff/devices ✅
Click "Sensor Data" → /staff/readings ✅
Click "Analytics" → /staff/analytics ✅
```

### Button Navigation

```bash
Dashboard → "View All Devices" → /staff/devices ✅
Dashboard → "View Details" → /staff/devices/[id]/readings ✅
Devices → "View" button → /staff/devices/[id]/readings ✅
```

### Root Redirect

```bash
Visit "/" → Redirects based on role:
- Admin → /admin/dashboard ✅
- Staff → /staff/dashboard ✅
- Not logged in → /auth/login ✅
```

---

## 🛡️ Access Control Testing

### Staff User (role: "Staff")

```bash
/staff/dashboard ✅ Allowed
/staff/devices ✅ Allowed
/staff/readings ✅ Allowed
/staff/analytics ✅ Allowed
/admin/dashboard ❌ Denied (403)
/admin/users ❌ Denied (403)
```

### Admin User (role: "Admin")

```bash
/staff/dashboard ✅ Allowed (can access both)
/staff/devices ✅ Allowed
/admin/dashboard ✅ Allowed
/admin/users ✅ Allowed
```

### Unapproved User (status: "Pending")

```bash
/staff/dashboard ❌ Redirect to /auth/pending-approval
/admin/dashboard ❌ Redirect to /auth/pending-approval
```

---

## 📱 Responsive Testing

### Desktop (> 1024px)

✅ Sidebar: Fixed, always visible  
✅ Content: Full width with sidebar offset  
✅ Tables: All columns visible  
✅ Charts: Full width  

### Tablet (768px - 1024px)

✅ Sidebar: Collapsible  
✅ Content: Responsive grid  
✅ Tables: Horizontal scroll if needed  
✅ Charts: Responsive width  

### Mobile (< 768px)

✅ Sidebar: Collapsed by default  
✅ Content: Single column  
✅ Tables: Horizontal scroll  
✅ Charts: Full mobile width  
✅ Stats: Stack vertically  

---

## 🎯 Expected Behavior

### First Load

1. **Not Logged In**:
   ```
   / → /auth/login
   ```

2. **Logged In (Pending)**:
   ```
   / → /auth/pending-approval
   ```

3. **Logged In (Staff, Approved)**:
   ```
   / → /staff/dashboard
   ```

4. **Logged In (Admin, Approved)**:
   ```
   / → /admin/dashboard
   ```

---

### Navigation Flow

```
Staff Dashboard Flow:
┌─────────────────┐
│  Staff Login    │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Staff Dashboard │ ← Default landing
└────────┬────────┘
         ↓
    ┌────┴─────┐
    ↓          ↓
┌─────────┐ ┌──────────┐
│ Devices │ │ Readings │
└─────────┘ └──────────┘
    ↓          ↓
┌──────────────────────┐
│     Analytics        │
└──────────────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Page Not Found (404)

**Symptom**: Navigating to `/staff/dashboard` shows 404

**Solution**:
1. Check router configuration
2. Verify component import
3. Restart dev server

```bash
# Stop server (Ctrl+C)
npm run dev
```

---

### Issue 2: Charts Not Rendering

**Symptom**: Analytics page shows blank where charts should be

**Solution**:
```bash
# Install recharts
npm install recharts

# Restart dev server
```

---

### Issue 3: Access Denied

**Symptom**: Staff user gets "Access Denied" error

**Solution**:
1. Check Firestore user document:
   ```
   status: "Approved" ✅
   role: "Staff" ✅
   ```
2. Sign out and sign in again
3. Clear browser cache

---

### Issue 4: Sidebar Not Collapsing

**Symptom**: Click toggle button, sidebar doesn't collapse

**Solution**:
1. Check console for errors
2. Verify `collapsed` state is working
3. Check CSS transitions

---

### Issue 5: Mock Data Not Showing

**Symptom**: Tables/cards show "No data"

**Solution**:
1. Check `useEffect` is running
2. Check `loading` state changes to `false`
3. Verify mock data structure matches table columns

---

## 📊 Mock Data Reference

### Devices (5 total)

```json
[
  {
    "id": "1",
    "name": "Device A",
    "location": "North Station",
    "status": "online"
  },
  {
    "id": "2",
    "name": "Device B",
    "location": "South Station",
    "status": "warning"
  },
  // ... 3 more
]
```

### Readings (5 recent)

```json
[
  {
    "timestamp": "2025-01-21 10:35:00",
    "device": "Device A",
    "ph": 7.2,
    "temperature": 25.5,
    "turbidity": 3.2,
    "status": "normal"
  },
  // ... 4 more
]
```

---

## 🎨 Visual Checklist

### Colors

- ✅ Green tags for "Online" and "Normal"
- ✅ Orange tags for "Warning"
- ✅ Red tags for "Critical" and "Offline"
- ✅ Blue tags for sensors
- ✅ Gray tags for inactive

### Icons

- ✅ Dashboard icon (DashboardOutlined)
- ✅ Devices icon (ApiOutlined)
- ✅ Readings icon (LineChartOutlined)
- ✅ Analytics icon (BarChartOutlined)
- ✅ Status icons (Check/Clock/Warning)

### Typography

- ✅ Page titles: Level 2, bold
- ✅ Section titles: Strong text
- ✅ Descriptions: Secondary text
- ✅ Values: Default or colored

---

## 🎯 Success Criteria

After completing this quick start, you should:

✅ See Staff Dashboard with live data  
✅ Navigate between all 4 staff pages  
✅ See charts rendering in Analytics  
✅ Filter and search working  
✅ Sidebar collapsing/expanding  
✅ User menu showing profile  
✅ Role-based redirect working  
✅ Access control enforced  

---

## 📞 Next Steps

1. **Replace Mock Data**:
   - Connect to Firebase Realtime Database
   - Implement real-time listeners
   - Update data structures

2. **Add Features**:
   - Export to PDF/Excel
   - Real-time notifications
   - Custom date ranges
   - Device favorites

3. **Testing**:
   - Write unit tests
   - E2E testing with Cypress
   - Performance testing

4. **Deployment**:
   - Build production bundle
   - Deploy to Firebase Hosting
   - Configure environment variables

---

**Time to Complete**: 5 minutes ⏱️  
**Difficulty**: Easy 🟢  
**Status**: ✅ Production Ready

---

Happy monitoring! 🎉
