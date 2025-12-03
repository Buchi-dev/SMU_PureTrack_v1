# ✅ V2 Integration Checklist

## Pre-Flight Checks

### Environment Setup
- [ ] Node.js installed (v18 or higher)
- [ ] MongoDB running or cloud connection available
- [ ] Firebase project configured
- [ ] HiveMQ MQTT broker credentials available

### Server Configuration
- [ ] `server_v2/.env` file exists
- [ ] `MONGODB_URI` configured
- [ ] `CORS_ORIGIN=http://localhost:5173`
- [ ] `PORT=5000`
- [ ] Firebase service account key in place

### Client Configuration
- [ ] `client/.env.development` file exists
- [ ] `VITE_API_BASE_URL=http://localhost:5000`
- [ ] Firebase client config variables set

---

## Server Startup Checklist

### Start V2 Backend
```powershell
cd E:\Capstone-Final-Final\server_v2
npm install  # First time only
npm run dev
```

**Expected Console Output**:
- [ ] `🚀 Server is running on port 5000`
- [ ] `📊 Environment: development`
- [ ] `🔗 API Version: v2`
- [ ] `✅ Connected to MongoDB`
- [ ] `✅ Firebase Admin SDK initialized`
- [ ] `✅ MQTT broker connected`

### Start Frontend
```powershell
cd E:\Capstone-Final-Final\client
npm install  # First time only
npm run dev
```

**Expected Console Output**:
- [ ] `VITE ready in XXX ms`
- [ ] `➜ Local: http://localhost:5173/`
- [ ] No error messages in terminal

---

## Authentication Test (5 minutes)

### Login Flow
- [ ] Navigate to `http://localhost:5173/auth/login`
- [ ] "Sign in with Google" button appears
- [ ] Click button → Google OAuth popup opens
- [ ] Select `@smu.edu.ph` email account
- [ ] Popup closes automatically
- [ ] Redirected to dashboard or appropriate page

### DevTools Verification (F12)
**Network Tab**:
- [ ] `POST /auth/verify-token` → Status 200
- [ ] Request has `Authorization: Bearer ...` header
- [ ] Response body contains user object

**Console Tab**:
- [ ] `[AuthContext] Firebase auth state changed: your.email@smu.edu.ph`
- [ ] `[API] Added token for user: your.email@smu.edu.ph`
- [ ] No red errors

**Backend Terminal**:
- [ ] `[Auth] Token verified for user: your.email@smu.edu.ph`
- [ ] `[User] User synced to MongoDB`

---

## Alerts Integration Test (10 minutes)

### Page Load
- [ ] Navigate to `/admin/alerts`
- [ ] Alert cards/table appears
- [ ] No "loading" state stuck
- [ ] Alert count displays in stats card

### DevTools Network Check
- [ ] `GET /api/v1/alerts` → Status 200
- [ ] Response format: `{ success: true, data: [...], pagination: {...} }`
- [ ] Authorization header present

### Acknowledge Alert
- [ ] Click "Acknowledge" button on any Unacknowledged alert
- [ ] `PATCH /api/v1/alerts/:id/acknowledge` → Status 200
- [ ] Alert status changes to "Acknowledged" immediately
- [ ] Alert moves to "Acknowledged" tab (if tabs exist)
- [ ] Stats card updates count

### Resolve Alert
- [ ] Click "Resolve" button on Acknowledged alert
- [ ] Resolution notes modal appears
- [ ] Enter notes and submit
- [ ] `PATCH /api/v1/alerts/:id/resolve` → Status 200
- [ ] Alert status changes to "Resolved"
- [ ] Alert moves to "Resolved" tab

### Alert Statistics
- [ ] Stats card shows correct counts
- [ ] `GET /api/v1/alerts/statistics` → Status 200
- [ ] byStatus and bySeverity data present

### Alert Filters
- [ ] Filter by status dropdown works
- [ ] Filter by severity dropdown works
- [ ] Filter by device dropdown works
- [ ] Query parameters in URL update
- [ ] Filtered results display correctly

---

## Devices Integration Test (10 minutes)

### Page Load
- [ ] Navigate to `/admin/devices`
- [ ] Device cards/table appears
- [ ] Device status badges show (online/offline)
- [ ] Device count displays

### DevTools Network Check
- [ ] `GET /api/v1/devices` → Status 200
- [ ] Response format: `{ success: true, data: [...] }`
- [ ] Device objects have `status`, `location`, `isRegistered`

### Device Details
- [ ] Click on a device
- [ ] Device details page loads
- [ ] `GET /api/v1/devices/:id` → Status 200
- [ ] Device metadata displays correctly
- [ ] Location displays as string

### Device Status
- [ ] Online devices show green badge
- [ ] Offline devices show red/gray badge
- [ ] Status icon matches device state

---

## Sensor Readings Test (10 minutes)

### Page Load
- [ ] Navigate to `/admin/readings` or `/admin/devices/:id/readings`
- [ ] Readings table/chart appears
- [ ] pH, Turbidity, TDS columns display

### DevTools Network Check
- [ ] `GET /api/v1/sensor-readings` → Status 200
- [ ] OR `GET /api/v1/devices/:id/readings` → Status 200
- [ ] Response contains readings with `pH` (capital H), `turbidity`, `tds`

### Data Display
- [ ] pH values display correctly (0-14 range)
- [ ] Turbidity values display with "NTU" unit
- [ ] TDS values display with "ppm" unit
- [ ] Timestamp displays correctly

### Filter by Device
- [ ] Device dropdown populates
- [ ] Select a device
- [ ] Query parameter adds `?deviceId=xxx`
- [ ] Only selected device's readings show

### Filter by Date Range
- [ ] Date range picker works
- [ ] Select start and end dates
- [ ] Query parameters add `?startDate=...&endDate=...`
- [ ] Only readings in range show

### Charts (if present)
- [ ] Line chart displays pH over time
- [ ] Line chart displays Turbidity over time
- [ ] Line chart displays TDS over time
- [ ] Chart axes labeled correctly

---

## Users Management Test (5 minutes)

### Page Load
- [ ] Navigate to `/admin/users` (Admin only)
- [ ] User table appears
- [ ] User roles display (admin/staff)
- [ ] User statuses display (active/pending/suspended)

### DevTools Network Check
- [ ] `GET /api/v1/users` → Status 200
- [ ] Response contains user objects

### Update User Role
- [ ] Click "Edit" or role dropdown
- [ ] Change user role (staff → admin or vice versa)
- [ ] `PATCH /api/v1/users/:id/role` → Status 200
- [ ] Role updates in UI immediately

### Update User Status
- [ ] Click "Approve" on pending user
- [ ] `PATCH /api/v1/users/:id/status` → Status 200
- [ ] Status changes to "Active"
- [ ] Status badge updates

---

## Reports Integration Test (10 minutes)

### Page Load
- [ ] Navigate to `/admin/reports`
- [ ] Report generation form appears
- [ ] Report history table appears (if exists)

### Generate Water Quality Report
- [ ] Fill out report form
  - [ ] Select report type: "Water Quality"
  - [ ] Select date range
  - [ ] Select devices (optional)
- [ ] Click "Generate Report"
- [ ] `POST /api/v1/reports/water-quality` → Status 200
- [ ] Report status shows "Generating"
- [ ] Wait for completion (polling or WebSocket)
- [ ] Report status changes to "Completed"

### Download Report
- [ ] "Download" button appears on completed report
- [ ] Click "Download"
- [ ] `GET /api/v1/reports/download/:fileId` → Status 200
- [ ] PDF file downloads successfully
- [ ] PDF opens and displays data

### Report History
- [ ] Navigate to report history (if separate page)
- [ ] `GET /api/v1/reports` → Status 200
- [ ] Past reports listed with metadata
- [ ] Report type, status, date display correctly

---

## Real-Time Updates Test (5 minutes)

### SWR Polling Verification
- [ ] Open DevTools Network tab
- [ ] Stay on a data-heavy page (e.g., alerts, devices)
- [ ] Observe repeated `GET` requests every 10-15 seconds
- [ ] No "429 Too Many Requests" errors
- [ ] Data updates without page refresh

### Add New Data (Backend)
- [ ] Use Arduino to send sensor reading
- [ ] OR use Postman to create alert
- [ ] Frontend page updates within polling interval (10-15s)
- [ ] No manual refresh needed

---

## Error Handling Test (5 minutes)

### Network Error
- [ ] Stop backend server (`Ctrl+C` in server terminal)
- [ ] Perform action in UI (e.g., acknowledge alert)
- [ ] Error toast/message appears
- [ ] Message is user-friendly (not raw error)

### Authentication Error
- [ ] Clear browser cookies/localStorage
- [ ] Refresh page
- [ ] Redirected to login page
- [ ] After login, redirected back to original page

### Validation Error
- [ ] Try to submit form with invalid data
- [ ] Validation error displays
- [ ] Form does not submit
- [ ] Error message is specific and helpful

---

## Performance Test (5 minutes)

### Page Load Times
- [ ] Dashboard loads in < 3 seconds
- [ ] Alerts page loads in < 3 seconds
- [ ] Devices page loads in < 3 seconds
- [ ] No prolonged "loading" states

### API Response Times
- [ ] Check Network tab for response times
- [ ] Most requests complete in < 500ms
- [ ] No requests timeout (> 10s)

### Memory Usage
- [ ] Open DevTools Performance tab
- [ ] Record for 30 seconds while browsing
- [ ] No memory leaks (heap size doesn't grow continuously)
- [ ] No excessive re-renders

---

## Mobile Responsive Test (5 minutes)

### DevTools Mobile View
- [ ] Open DevTools (F12)
- [ ] Toggle device toolbar (Ctrl+Shift+M)
- [ ] Select "iPhone 12 Pro" or similar
- [ ] Navigate through pages
- [ ] UI elements are touch-friendly
- [ ] No horizontal scrolling
- [ ] Text is readable (not too small)

---

## Final Verification

### All Endpoints Working
- [ ] ✅ Authentication (`/auth/*`)
- [ ] ✅ Alerts (`/api/v1/alerts/*`)
- [ ] ✅ Devices (`/api/v1/devices/*`)
- [ ] ✅ Sensor Readings (`/api/v1/sensor-readings/*`)
- [ ] ✅ Users (`/api/v1/users/*`)
- [ ] ✅ Reports (`/api/v1/reports/*`)

### No Console Errors
- [ ] Browser console has no red errors
- [ ] Backend terminal has no critical errors
- [ ] Zod validation errors absent

### Data Consistency
- [ ] Data displayed matches database
- [ ] Timestamps are correct
- [ ] Status values are accurate
- [ ] Calculations (stats, averages) are correct

---

## 🎉 Success Criteria

### All Tests Passed
- [ ] ✅ Authentication works
- [ ] ✅ Alerts CRUD works
- [ ] ✅ Devices display correctly
- [ ] ✅ Sensor readings load
- [ ] ✅ Users management works
- [ ] ✅ Reports generate and download
- [ ] ✅ Real-time updates work
- [ ] ✅ Error handling graceful
- [ ] ✅ Performance acceptable
- [ ] ✅ Mobile responsive

### Ready for Production
- [ ] All critical tests passed
- [ ] No blocking bugs found
- [ ] Error handling tested
- [ ] Security verified (token auth works)
- [ ] Documentation complete

---

## 📝 Notes Section

**Issues Found**:
```
(Document any issues here)
Example:
- Alert status not updating immediately → Fixed by adding cache invalidation
- pH values showing as undefined → Fixed by updating schema field name
```

**Performance Observations**:
```
(Note any performance concerns)
Example:
- Initial page load: 2.5 seconds
- API response time average: 300ms
- Memory usage stable at ~50MB
```

**Browser Compatibility**:
```
(Test on different browsers)
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (if available)
```

---

**Testing Date**: _____________  
**Tested By**: _____________  
**Overall Status**: ⬜ PASS / ⬜ FAIL / ⬜ NEEDS FIXES  
**Ready for Production**: ⬜ YES / ⬜ NO
