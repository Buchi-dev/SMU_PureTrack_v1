# Architecture Rules: READ vs WRITE Operations

## 🎯 Core Principle

**Client-side operations are strictly separated into READ and WRITE operations with different data flow patterns.**

---

## 📖 READ OPERATIONS

### Rule 1: Direct Firestore/RTDB Access
**All READ operations go directly from client to Firebase (Firestore/RTDB) using real-time listeners.**

### Implementation Pattern

```typescript
// ✅ CORRECT: Direct real-time listener
const unsubscribe = alertsService.subscribeToAlerts(
  (data) => setData(data),
  (error) => handleError(error),
  limit
);

// Cleanup on unmount
return () => unsubscribe();
```

### Architecture Flow
```
┌──────────────┐
│    CLIENT    │
│  (Component) │
└──────┬───────┘
       │ READ (Real-time listener)
       │ - onSnapshot (Firestore)
       │ - onValue (RTDB)
       ↓
┌──────────────────┐
│  Firestore/RTDB  │
│  (Direct Access) │
└──────────────────┘
```

### Security
- **Firestore Security Rules** enforce read permissions
- Rules check: `allow read: if isAuthenticated()`
- Client cannot read unauthorized data

### Examples

#### Alerts (Firestore)
```typescript
// Service Layer: alerts.Service.ts
subscribeToAlerts(
  onUpdate: (alerts: WaterQualityAlert[]) => void,
  onError: (error: Error) => void,
  maxAlerts: number = 20
): Unsubscribe {
  const alertsQuery = query(
    collection(this.db, 'alerts'),
    orderBy('createdAt', 'desc'),
    limit(maxAlerts)
  );

  return onSnapshot(alertsQuery, 
    (snapshot) => onUpdate(snapshot.docs.map(...)),
    (err) => onError(err)
  );
}
```

#### Sensor Data (RTDB)
```typescript
// Hook: useDevices.ts
const sensorRef = ref(rtdb, `sensorReadings/${deviceId}/latestReading`);
onValue(sensorRef, (snapshot) => {
  const reading = snapshot.val();
  updateDevice(reading);
});
```

### READ Operation Rules

| Rule # | Description | Enforcement |
|--------|-------------|-------------|
| R1 | Use real-time listeners (onSnapshot/onValue) | Code review |
| R2 | Never poll with setInterval for reads | Linting |
| R3 | Implement in service layer, consume in hooks/components | Architecture |
| R4 | Clean up listeners on unmount | Memory leak prevention |
| R5 | Handle errors with callbacks | User experience |

---

## ✍️ WRITE OPERATIONS

### Rule 2: Cloud Functions Only
**All WRITE operations must go through Firebase Cloud Functions (callable functions).**

### Implementation Pattern

```typescript
// ✅ CORRECT: Write via Cloud Function
async acknowledgeAlert(alertId: string): Promise<void> {
  const callable = httpsCallable<Request, Response>(
    this.functions, 
    'alertManagement'
  );
  
  const result = await callable({ 
    action: 'acknowledgeAlert', 
    alertId 
  });
  
  if (!result.data.success) {
    throw new Error(result.data.error);
  }
}

// ❌ WRONG: Direct Firestore write
updateDoc(doc(db, 'alerts', alertId), { status: 'Acknowledged' });
```

### Architecture Flow
```
┌──────────────┐
│    CLIENT    │
│  (Component) │
└──────┬───────┘
       │ WRITE (httpsCallable)
       ↓
┌──────────────────┐
│ Cloud Functions  │
│  (Validation &   │
│  Business Logic) │
└──────┬───────────┘
       │ Validated Write
       ↓
┌──────────────────┐
│  Firestore/RTDB  │
│  (Data Storage)  │
└──────────────────┘
       │ Real-time update
       ↓
┌──────────────┐
│    CLIENT    │
│  (Auto-sync) │
└──────────────┘
```

### Security
- **Firestore Rules**: `allow write: if false;` (client blocked)
- **Cloud Functions** validate all writes
- **Authentication** checked server-side
- **Business logic** enforced server-side

### Why Cloud Functions?

1. **Validation**: Server-side data validation
2. **Authorization**: Role-based access control (Admin only)
3. **Business Logic**: Complex workflows (notifications, logging)
4. **Atomicity**: Transaction support
5. **Security**: Single source of truth
6. **Audit Trail**: Centralized logging

### Examples

#### Acknowledge Alert
```typescript
// Service Layer: alerts.Service.ts
async acknowledgeAlert(alertId: string): Promise<void> {
  return this.callFunction<AcknowledgeAlertRequest>(
    'acknowledgeAlert', 
    { alertId }
  );
}

// Component: AdminAlerts.tsx
const acknowledgeAlert = async (alertId: string) => {
  try {
    await alertsService.acknowledgeAlert(alertId);
    message.success('Alert acknowledged successfully');
    // No manual reload needed - real-time listener updates automatically
  } catch (error: any) {
    message.error(error.message || 'Failed to acknowledge alert');
  }
};
```

#### Resolve Alert
```typescript
// Service Layer: alerts.Service.ts
async resolveAlert(alertId: string, notes?: string): Promise<void> {
  return this.callFunction<ResolveAlertRequest>(
    'resolveAlert', 
    { alertId, notes }
  );
}

// Component: AdminAlerts.tsx
const resolveAlert = async (alertId: string, notes?: string) => {
  try {
    await alertsService.resolveAlert(alertId, notes);
    message.success('Alert resolved successfully');
    setDetailsVisible(false);
    // Real-time listener automatically syncs the update
  } catch (error: any) {
    message.error(error.message || 'Failed to resolve alert');
  }
};
```

### WRITE Operation Rules

| Rule # | Description | Enforcement |
|--------|-------------|-------------|
| W1 | All writes go through Cloud Functions | Firestore Rules |
| W2 | Never use updateDoc/setDoc from client | Code review |
| W3 | Validate all inputs server-side | Cloud Functions |
| W4 | Return success/error response | API contract |
| W5 | Log all write operations | Audit requirements |
| W6 | No manual data refresh after write | Real-time sync |

---

## 🔄 Complete Data Flow

### User Updates Alert Status

```
1. User clicks "Acknowledge" button
   ↓
2. Component calls: alertsService.acknowledgeAlert(alertId)
   ↓
3. Service calls: Cloud Function (httpsCallable)
   ↓
4. Cloud Function:
   - Validates user is Admin
   - Validates alert exists
   - Validates current status is 'Active'
   - Updates Firestore: status = 'Acknowledged'
   - Logs action
   - Sends notifications
   ↓
5. Firestore triggers real-time listener
   ↓
6. Client receives update via onSnapshot
   ↓
7. Component re-renders with new data
   ↓
8. User sees updated status (no page refresh)
```

---

## 📁 File Organization

### Service Layer (`services/`)
**Centralized data access logic**

```
services/
├── alerts.Service.ts
│   ├── READ:  subscribeToAlerts()
│   ├── WRITE: acknowledgeAlert()
│   └── WRITE: resolveAlert()
├── deviceManagement.Service.ts
├── userManagement.Service.ts
└── reports.Service.ts
```

### Hook Layer (`hooks/`)
**Reusable state management**

```
hooks/
├── useAlerts.ts          // Wraps alertsService.subscribeToAlerts()
├── useDevices.ts         // Real-time RTDB listener
└── useHistoricalData.ts  // Real-time RTDB listener
```

### Component Layer (`pages/` & `components/`)
**UI and user interaction**

```
pages/admin/
├── AdminDashboard/
│   └── AdminDashboard.tsx    // Uses: useAlerts, useDevices
└── AdminAlerts/
    └── AdminAlerts.tsx       // Uses: alertsService (R+W)
```

---

## 🔒 Security Rules

### Firestore Rules (`firestore.rules`)

```javascript
match /alerts/{alertId} {
  // ✅ READ: All authenticated users
  allow read: if isAuthenticated();
  
  // ✅ WRITE (UPDATE): Admins only, specific fields
  allow update: if isAdmin()
                && request.resource.data.diff(resource.data)
                     .affectedKeys()
                     .hasOnly(['status', 'acknowledgedAt', 'resolvedAt', ...]);
  
  // ❌ WRITE (CREATE/DELETE): Blocked from client
  allow create, delete: if false;
}
```

### RTDB Rules (`database.rules.json`)

```json
{
  "rules": {
    "sensorReadings": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

---

## 🚫 Anti-Patterns

### ❌ WRONG: Polling for reads
```typescript
// DON'T DO THIS
useEffect(() => {
  const loadData = async () => {
    const data = await fetchAlerts();
    setAlerts(data);
  };
  
  loadData();
  const interval = setInterval(loadData, 30000); // ❌ Polling
  return () => clearInterval(interval);
}, []);
```

### ✅ CORRECT: Real-time listener
```typescript
// DO THIS
useEffect(() => {
  const unsubscribe = alertsService.subscribeToAlerts(
    (data) => setAlerts(data),
    (error) => handleError(error)
  );
  return () => unsubscribe(); // ✅ Real-time
}, []);
```

### ❌ WRONG: Direct client writes
```typescript
// DON'T DO THIS
const acknowledgeAlert = async (alertId: string) => {
  await updateDoc(doc(db, 'alerts', alertId), {
    status: 'Acknowledged',
    acknowledgedAt: serverTimestamp()
  }); // ❌ Direct write
};
```

### ✅ CORRECT: Cloud Function writes
```typescript
// DO THIS
const acknowledgeAlert = async (alertId: string) => {
  await alertsService.acknowledgeAlert(alertId); // ✅ Via function
};
```

### ❌ WRONG: Manual reload after write
```typescript
// DON'T DO THIS
const resolveAlert = async (alertId: string) => {
  await alertsService.resolveAlert(alertId);
  await loadAlerts(); // ❌ Manual reload
};
```

### ✅ CORRECT: Trust real-time sync
```typescript
// DO THIS
const resolveAlert = async (alertId: string) => {
  await alertsService.resolveAlert(alertId);
  // ✅ Real-time listener automatically updates
};
```

---

## 📊 Performance Considerations

### READ Operations
- **Real-time listeners**: Efficient WebSocket connections
- **Query limits**: Limit data to necessary amount (e.g., 20 alerts)
- **Indexes**: Ensure composite indexes for complex queries
- **Unsubscribe**: Always clean up listeners to prevent memory leaks

### WRITE Operations
- **Debouncing**: Prevent rapid successive writes
- **Optimistic UI**: Show loading states during writes
- **Error handling**: Always handle and display errors
- **No cascading writes**: Single function call per user action

---

## 🧪 Testing Guidelines

### READ Tests
```typescript
test('subscribes to real-time alerts', () => {
  const { result } = renderHook(() => useAlerts());
  
  expect(result.current.loading).toBe(true);
  
  // Wait for subscription
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.alerts).toHaveLength(20);
  });
});
```

### WRITE Tests
```typescript
test('acknowledges alert via cloud function', async () => {
  const mockCallable = jest.fn().mockResolvedValue({
    data: { success: true }
  });
  
  await alertsService.acknowledgeAlert('alert123');
  
  expect(mockCallable).toHaveBeenCalledWith({
    action: 'acknowledgeAlert',
    alertId: 'alert123'
  });
});
```

---

## 📚 Quick Reference

| Operation | Method | Path | Real-time |
|-----------|--------|------|-----------|
| **READ** Alerts | `subscribeToAlerts()` | Client → Firestore | ✅ Yes |
| **READ** Sensors | `onValue()` | Client → RTDB | ✅ Yes |
| **WRITE** Acknowledge | `acknowledgeAlert()` | Client → Function → Firestore | ✅ Auto-sync |
| **WRITE** Resolve | `resolveAlert()` | Client → Function → Firestore | ✅ Auto-sync |
| **WRITE** Create Device | `addDevice()` | Client → Function → Firestore | ✅ Auto-sync |

---

## 🎓 Summary

### Golden Rules

1. **READ = Real-time Listener** (onSnapshot/onValue)
2. **WRITE = Cloud Function** (httpsCallable)
3. **Never poll** with setInterval
4. **Never write directly** from client
5. **Always clean up** listeners
6. **Trust real-time sync** after writes
7. **Security rules** enforce the pattern

### Benefits

- ⚡ **Real-time updates** across all clients
- 🔒 **Secure** with server-side validation
- 📊 **Scalable** with Firebase infrastructure
- 🐛 **Maintainable** with clear separation
- 🚀 **Performant** with efficient listeners
- ✅ **Reliable** with atomic operations

---

**Last Updated:** November 4, 2025  
**Architecture Version:** 2.0 (Real-time)
