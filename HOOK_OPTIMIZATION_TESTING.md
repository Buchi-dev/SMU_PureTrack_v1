# HOOK OPTIMIZATION - TESTING GUIDE
# ==================================

## 🎯 Testing Objectives

Verify that the hook optimization is working correctly by ensuring:
1. ✅ Data only fetches when needed for the current page
2. ✅ Polling stops when navigating away from pages
3. ✅ Real-time updates still work on active pages
4. ✅ Cache invalidation works after mutations
5. ✅ No performance degradation

## 🧪 Testing Procedure

### Test 1: Verify Conditional Fetching

**Goal**: Confirm that only relevant data is fetched on each page

#### Steps:
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Click **Clear** to remove old requests
4. Enable **"Preserve log"** checkbox
5. Navigate to different pages and observe network requests

#### Expected Results:

**On Staff Dashboard (`/staff/dashboard`):**
```
✅ /api/devices - Polling every 15s
✅ /api/alerts  - Polling every 5s
✅ /api/analytics/summary - Polling every 30s
❌ /api/users  - Should NOT be fetching
```

**On Device Management (`/staff/devices`):**
```
✅ /api/devices - Polling every 15s
✅ /api/alerts  - Polling every 5s (for device alerts)
❌ /api/users   - Should NOT be fetching
❌ /api/analytics - Should NOT be fetching
```

**On Readings Page (`/staff/readings`):**
```
✅ /api/devices - Polling every 15s (for sensor data)
❌ /api/alerts  - Should NOT be fetching
❌ /api/users   - Should NOT be fetching
❌ /api/analytics - Should NOT be fetching
```

**On User Management (`/admin/user-management`):**
```
✅ /api/users   - Polling every 15s
❌ /api/devices - Should NOT be fetching
❌ /api/alerts  - Should NOT be fetching
❌ /api/analytics - Should NOT be fetching
```

**On Settings Page (`/staff/settings`):**
```
✅ /api/devices - Polling every 15s (for device preferences)
✅ /api/users   - For user profile
❌ /api/alerts  - Should NOT be fetching
❌ /api/analytics - Should NOT be fetching
```

### Test 2: Verify Polling Stops on Navigation

**Goal**: Confirm that polling stops when leaving a page

#### Steps:
1. Open DevTools → Network tab
2. Navigate to **Device Management** page
3. Observe `/api/devices` requests coming every 15 seconds
4. Note the timestamp of the last request
5. Navigate to **User Management** page
6. Wait 20-30 seconds
7. Check the Network tab

#### Expected Results:
```
✅ /api/devices requests STOP after navigation
✅ /api/users requests START after navigation
✅ No new /api/devices requests appear
```

### Test 3: Global Alert Notifications

**Goal**: Verify AlertNotificationCenter uses longer polling interval

#### Steps:
1. Open DevTools → Network tab
2. Clear requests
3. Stay on any page (e.g., Dashboard)
4. Observe `/api/alerts` requests in the Network tab
5. Count the time between requests

#### Expected Results:
```
✅ Page-level alerts: Every 5 seconds (if on dashboard/devices)
✅ AlertNotificationCenter: Every 30 seconds
✅ Both requests show in network log with different intervals
```

To distinguish:
- Look for requests with different query params
- Page-level may have filters (status, severity)
- Global alerts have `limit=50`

### Test 4: Cache Invalidation After Mutations

**Goal**: Verify SWR cache updates after write operations

#### Steps:
1. Go to Dashboard with active alerts
2. Open DevTools → Network tab
3. Acknowledge an alert
4. Observe the network requests

#### Expected Results:
```
✅ POST /api/alerts/{id}/acknowledge - Mutation request
✅ GET /api/alerts - Automatic refetch triggered
✅ Alert status updates in UI immediately
✅ No manual page refresh needed
```

### Test 5: Performance Monitoring

**Goal**: Measure actual performance improvements

#### Steps:
1. Open DevTools → Performance tab
2. Click **Record**
3. Navigate through pages (Dashboard → Devices → Users → Settings)
4. Stop recording after 30 seconds
5. Analyze the timeline

#### Expected Results:
```
✅ Fewer network requests overall
✅ Lower CPU usage during navigation
✅ Faster page transition times
✅ Reduced memory consumption
```

### Test 6: Stress Test - Rapid Navigation

**Goal**: Verify no memory leaks or race conditions

#### Steps:
1. Rapidly navigate between pages:
   - Dashboard → Devices → Readings → Analytics → Users → Settings
2. Repeat 10 times
3. Open DevTools → Memory tab
4. Take a heap snapshot after navigation
5. Check for memory leaks

#### Expected Results:
```
✅ No accumulating network requests
✅ Memory usage stays stable
✅ No console errors
✅ UI remains responsive
```

## 📊 Performance Metrics to Track

### Before Optimization (Baseline)

Record these metrics BEFORE applying the optimization:

| Metric | Value | Notes |
|--------|-------|-------|
| API calls per minute | ___ | Count requests in Network tab |
| Data transferred per minute | ___ | Check Network tab summary |
| Page load time (avg) | ___ | Performance tab |
| CPU usage (avg) | ___ | Task Manager |
| Memory usage | ___ | DevTools Memory tab |

### After Optimization (Expected Improvements)

| Metric | Expected | Improvement |
|--------|----------|-------------|
| API calls per minute | ~70% reduction | ✅ Much fewer requests |
| Data transferred | ~60% reduction | ✅ Less bandwidth |
| Page load time | ~20% faster | ✅ Quicker transitions |
| CPU usage | ~30% lower | ✅ Less processing |
| Memory usage | ~15% lower | ✅ More efficient |

## 🔍 Debugging Common Issues

### Issue 1: Data Still Fetching on Wrong Page

**Symptom**: Alerts fetching on User Management page

**Check**:
1. Verify `useRouteContext` is imported
2. Confirm `enabled` prop is passed to hook
3. Check route path matches pattern in `useRouteContext.ts`

**Fix**:
```typescript
// ❌ Wrong
const { alerts } = useRealtime_Alerts();

// ✅ Correct
const { needsAlerts } = useRouteContext();
const { alerts } = useRealtime_Alerts({ enabled: needsAlerts });
```

### Issue 2: Data Not Loading on Page

**Symptom**: Empty data on a page that should show results

**Check**:
1. Verify route pattern in `useRouteContext.ts` includes your page
2. Check browser console for errors
3. Verify API endpoint is responding

**Debug**:
```typescript
const { needsDevices } = useRouteContext();
console.log('needsDevices:', needsDevices); // Should be true on devices page
```

### Issue 3: Stale Data After Mutation

**Symptom**: UI doesn't update after acknowledging alert

**Check**:
1. Verify write hook includes `mutate()` call
2. Check cache key pattern matches
3. Look for console errors

**Fix**: Ensure write hooks invalidate cache:
```typescript
// In useCall_Alerts
await alertsService.acknowledgeAlert(alertId);
mutate((key: string) => typeof key === 'string' && key.includes('/alerts'));
```

### Issue 4: Polling Too Frequent/Infrequent

**Symptom**: Requests coming too often or not often enough

**Check**:
1. Verify polling interval in hook configuration
2. Check if custom `refreshInterval` is set
3. Review SWR config

**Adjust**:
```typescript
// For faster updates (critical data)
const { alerts } = useRealtime_Alerts({ 
  enabled: needsAlerts,
  refreshInterval: 3000 // 3 seconds
});

// For slower updates (less critical data)
const { analytics } = useRealtime_AnalyticsData({ 
  enabled: needsAnalytics,
  refreshInterval: 60000 // 1 minute
});
```

## 🎓 Testing Checklist

### Pre-Deployment Testing

- [ ] All pages load correctly
- [ ] Data displays properly on each page
- [ ] Navigation between pages works smoothly
- [ ] No console errors or warnings
- [ ] Network tab shows correct fetching behavior
- [ ] Mutations trigger cache invalidation
- [ ] Real-time updates work on active pages
- [ ] Polling stops when navigating away
- [ ] Global alerts continue in background
- [ ] Performance improvements are measurable

### Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Device Testing

Test on different devices:

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## 📈 Success Criteria

The optimization is successful if:

1. ✅ **Network Requests**: 70-80% reduction in unnecessary calls
2. ✅ **Page Performance**: 20-30% faster page transitions
3. ✅ **Data Freshness**: Real-time updates still work correctly
4. ✅ **Cache Management**: Mutations trigger automatic refetch
5. ✅ **User Experience**: No degradation in functionality
6. ✅ **Developer Experience**: Easier to add new pages

## 🚀 Production Monitoring

After deployment, monitor:

1. **Server Metrics**:
   - API request rate (should decrease)
   - Database query count (should decrease)
   - Server CPU/memory (should decrease)

2. **Client Metrics**:
   - Page load times (should decrease)
   - Error rates (should stay same or improve)
   - User engagement (should stay same or improve)

3. **User Feedback**:
   - Performance perception
   - Data freshness satisfaction
   - Any missing functionality

## 📝 Test Report Template

```markdown
## Hook Optimization Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Dev/Staging/Production]

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Conditional Fetching | [ ] Pass [ ] Fail | |
| Polling Stops on Navigation | [ ] Pass [ ] Fail | |
| Global Notifications | [ ] Pass [ ] Fail | |
| Cache Invalidation | [ ] Pass [ ] Fail | |
| Performance Improvement | [ ] Pass [ ] Fail | |
| Stress Test | [ ] Pass [ ] Fail | |

### Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API calls/min | | | |
| Page load time | | | |
| CPU usage | | | |
| Memory usage | | | |

### Issues Found

1. [Issue description]
   - **Severity**: [Low/Medium/High]
   - **Steps to reproduce**: 
   - **Expected**: 
   - **Actual**: 

### Recommendations

- [Recommendation 1]
- [Recommendation 2]

### Overall Assessment

[ ] Ready for production
[ ] Needs minor fixes
[ ] Needs major fixes
```

---

**Remember**: The goal is not just to reduce requests, but to maintain excellent user experience while improving performance! 🚀
