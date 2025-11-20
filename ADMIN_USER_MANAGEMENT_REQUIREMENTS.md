# 🔍 Client Admin User Management - Complete Analysis

## Overview
This document provides a comprehensive breakdown of the current Firebase-based Admin User Management system in the client app, to guide Express/MongoDB migration.

---

## 📋 CURRENT IMPLEMENTATION SUMMARY

### Architecture Pattern
```
Service Layer (user.Service.ts)
    ↓ (Firebase Cloud Functions + Firestore)
Global Hooks Layer
    ↓ useRealtime_Users() - READ
    ↓ useCall_Users() - WRITE
UI Layer (AdminUserManagement page)
```

---

## 1️⃣ HOW ADMINS FETCH USER LIST

### Current Implementation (Firebase)

**Endpoint/Method:**
- **Firestore Real-time Listener** via `usersService.subscribeToUsers()`
- Collection: `users`
- Ordered by: `createdAt DESC`

**Data Source:**
```typescript
// Service: user.Service.ts
subscribeToUsers(
  onUpdate: (users: UserListData[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(usersQuery, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      uuid: data.uuid || '',
      firstname: data.firstname || '',
      lastname: data.lastname || '',
      middlename: data.middlename || '',
      department: data.department || '',
      phoneNumber: data.phoneNumber || '',
      email: data.email || '',
      role: data.role as UserRole,
      status: data.status as UserStatus,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
      lastLogin: data.lastLogin?.toDate(),
    }));
    onUpdate(users);
  });
}
```

**Hook Used:**
```typescript
// Hook: useRealtime_Users.ts
const { users, isLoading, error } = useRealtime_Users();
```

**Filters/Features:**
- ❌ **NO server-side filtering** currently
- ❌ **NO pagination** currently
- ❌ **NO search** currently (client-side only)
- ✅ **Real-time updates** via Firestore onSnapshot
- ✅ **Defensive caching** (prevents empty state regression)

**User Schema (Firestore):**
```typescript
interface UserListData {
  id: string;              // Firestore document ID
  uuid: string;            // Firebase Auth UID
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: 'Admin' | 'Staff';       // UserRole
  status: 'Pending' | 'Approved' | 'Suspended'; // UserStatus
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}
```

---

## 2️⃣ HOW ADMINS CREATE A USER

### Current Implementation

**Status:** ❌ **NOT IMPLEMENTED**

```typescript
// Button is disabled in UI
<Button
  type="primary"
  icon={<PlusOutlined />}
  disabled
  title="Users are created through registration"
>
  Add User
</Button>
```

**Current Flow:**
- Users self-register via Google OAuth (`/auth/login`)
- Backend Cloud Function `beforeCreate` creates user document in Firestore
- Admin must manually approve them (change status from `Pending` to `Approved`)

**Fields Auto-Generated:**
- `uuid` - Firebase Auth UID
- `email` - From Google OAuth
- `createdAt` - Server timestamp
- `role` - Default: `'Staff'`
- `status` - Default: `'Pending'`

**Fields Required After Registration:**
- `firstname`, `lastname` - User completes via `/auth/complete-account`
- `middlename` (optional)
- `department`
- `phoneNumber`

---

## 3️⃣ HOW ADMINS UPDATE A USER

### Current Implementation (Firebase)

**Method:** Firebase Cloud Function `UserCalls` with actions:

#### A. Update User Status

**Action:** `updateStatus`

**Endpoint (Cloud Function):**
```typescript
// Service method
await usersService.updateUserStatus(userId, status);

// Cloud Function payload
{
  action: 'updateStatus',
  userId: string,
  status: 'Pending' | 'Approved' | 'Suspended'
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  userId: string;
  status: UserStatus;
  requiresLogout?: boolean; // TRUE if admin changes their own status
}
```

**UI Hook:**
```typescript
const { updateUserStatus } = useCall_Users();
await updateUserStatus('user-123', 'Approved');
```

---

#### B. Update User Role and/or Status

**Action:** `updateUser`

**Endpoint (Cloud Function):**
```typescript
// Service method
await usersService.updateUser(userId, status?, role?);

// Cloud Function payload
{
  action: 'updateUser',
  userId: string,
  status?: 'Pending' | 'Approved' | 'Suspended',
  role?: 'Admin' | 'Staff'
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  userId: string;
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
  requiresLogout?: boolean; // TRUE if admin changes their own role/status
}
```

**UI Hook:**
```typescript
const { updateUser } = useCall_Users();
await updateUser('user-123', 'Approved', 'Admin');
```

---

#### C. Update User Profile (Name, Department, Phone)

**Action:** `updateUserProfile`

**Endpoint (Cloud Function):**
```typescript
// Service method
await usersService.updateUserProfile(userId, profileData);

// Cloud Function payload
{
  action: 'updateUserProfile',
  userId: string,
  firstname?: string,
  middlename?: string,
  lastname?: string,
  department?: string,
  phoneNumber?: string
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  userId: string;
  updates: {
    firstname?: string;
    middlename?: string;
    lastname?: string;
    department?: string;
    phoneNumber?: string;
  }
}
```

**Editable Fields:**
- ✅ `firstname`
- ✅ `middlename`
- ✅ `lastname`
- ✅ `department`
- ✅ `phoneNumber`
- ✅ `role` (separate action)
- ✅ `status` (separate action)
- ❌ `email` (NOT editable - tied to Google OAuth)
- ❌ Password (N/A - Google OAuth only)

**UI Hook:**
```typescript
const { updateUserProfile } = useCall_Users();
await updateUserProfile('user-123', {
  firstname: 'John',
  lastname: 'Doe',
  department: 'Engineering',
  phoneNumber: '+1234567890'
});
```

---

## 4️⃣ HOW ADMINS DELETE A USER

### Current Implementation (Firebase)

**Action:** `deleteUser`

**Endpoint (Cloud Function):**
```typescript
// Service method
await usersService.deleteUser(userId);

// Cloud Function payload
{
  action: 'deleteUser',
  userId: string
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  userId: string;
  deletedFromAuth: boolean;      // Firebase Auth deletion success
  deletedFromFirestore: boolean; // Firestore doc deletion success
}
```

**Behavior:**
- ✅ **HARD DELETE** - Permanently removes user
- Deletes from **Firebase Authentication**
- Deletes from **Firestore** (`users/{userId}`)
- Includes **notification preferences** subcollection deletion
- ❌ NO soft delete option currently

**UI Confirmation Modal:**
```typescript
Modal.confirm({
  title: 'Delete User?',
  content: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
  okText: 'Delete',
  okType: 'danger',
  onOk: () => handleDeleteUser(userId, userName)
});
```

---

## 5️⃣ EXTRA ADMIN ACTIONS

### Current Implemented Actions

#### A. Quick Status Changes
```typescript
// Approve user
await usersService.approveUser(userId); 
// → updateUserStatus(userId, 'Approved')

// Suspend user
await usersService.suspendUser(userId);
// → updateUserStatus(userId, 'Suspended')

// Reactivate user
await usersService.reactivateUser(userId);
// → updateUserStatus(userId, 'Approved')
```

#### B. Quick Role Changes
```typescript
// Promote to Admin
await usersService.promoteToAdmin(userId);
// → updateUser(userId, undefined, 'Admin')

// Demote to Staff
await usersService.demoteToStaff(userId);
// → updateUser(userId, undefined, 'Staff')
```

#### C. Notification Preferences Management
```typescript
// Get user preferences
await usersService.getUserPreferences(userId);

// Setup/update preferences
await usersService.setupPreferences({
  userId: string,
  email: string,
  emailNotifications: boolean,
  pushNotifications: boolean,
  sendScheduledAlerts: boolean,
  alertSeverities: string[],
  parameters: string[],
  devices: string[],
  quietHoursEnabled: boolean,
  quietHoursStart?: string,
  quietHoursEnd?: string
});

// Enable email notifications
await usersService.enableEmailNotifications(userId, email);

// Disable email notifications
await usersService.disableEmailNotifications(userId, email);

// Delete preferences
await usersService.deletePreferences(userId);

// List all preferences (Admin only)
await usersService.listAllPreferences();
```

### NOT Currently Implemented

❌ **Reset Password** - Not applicable (Google OAuth only)  
❌ **Upload Profile Picture** - Not implemented  
❌ **Assign Granular Permissions** - Only role-based (Admin/Staff)  
❌ **Bulk Operations** - No batch updates  
❌ **User Activity Logs** - Not tracked  
❌ **Email Verification** - Handled by Google OAuth  

---

## 6️⃣ SPECIAL BEHAVIORS & EDGE CASES

### A. Admin Self-Modification Protection

**Scenario:** Admin changes their own role or status

**Response includes:**
```typescript
{
  requiresLogout: true
}
```

**UI Behavior:**
```typescript
useEffect(() => {
  if (updateResult?.requiresLogout) {
    Modal.success({
      title: 'Account Updated Successfully',
      content: 'You will be logged out in 3 seconds to apply changes.',
      onOk: () => signOut(auth)
    });
    
    setTimeout(() => signOut(auth), 3000);
  }
}, [updateResult]);
```

### B. Defensive State Caching

**Purpose:** Prevent UI from showing empty user list during Firestore listener stalls

**Logic:**
```typescript
// Cache last valid snapshot
let lastValidSnapshot: UserListData[] | null = null;

// Reject empty snapshots during active session
if (!isFirstSnapshot && users.length === 0 && lastValidSnapshot && lastValidSnapshot.length > 0) {
  console.warn('Rejecting empty snapshot - maintaining cached state');
  return; // Don't propagate empty state
}
```

### C. Error Handling

**Cloud Function Errors:**
```typescript
ERROR_MESSAGES = {
  'functions/unauthenticated': 'Please log in to perform this action',
  'functions/permission-denied': 'You do not have permission',
  'functions/not-found': 'User not found',
  'functions/invalid-argument': 'Invalid request parameters',
  'functions/failed-precondition': '', // Use backend message
  'functions/internal': 'Internal error occurred',
  'functions/unavailable': 'Service temporarily unavailable',
  'functions/deadline-exceeded': 'Request timeout',
}
```

**Auto Token Refresh:**
```typescript
// If permission denied, refresh Firebase token and retry once
if (error.code === 'functions/permission-denied') {
  await refreshUserToken();
  // Retry the operation
}
```

---

## 7️⃣ MONGODB SCHEMA MAPPING

### Current Firebase Model → Desired MongoDB Model

| Firebase (OLD) | MongoDB (NEW) | Notes |
|----------------|---------------|-------|
| `uuid` | Remove | Use `_id` or `googleId` |
| `id` (Firestore doc ID) | `_id` | MongoDB primary key |
| `firstname` | `firstName` | camelCase |
| `lastname` | `lastName` | camelCase |
| `middlename` | Remove? | Optional, may not fit MongoDB model |
| `department` | Remove? | Not in current MongoDB model |
| `phoneNumber` | Remove? | Not in current MongoDB model |
| `email` | `email` | ✅ Keep |
| `role: 'Admin'|'Staff'` | `role: 'admin'|'staff'|'user'` | Lowercase |
| `status: 'Pending'|'Approved'|'Suspended'` | `status: 'active'|'inactive'|'suspended'` | Different values |
| `createdAt` | `createdAt` | ✅ Keep |
| `updatedAt` | `updatedAt` | ✅ Keep |
| `lastLogin` | `lastLogin` | ✅ Keep |
| ❌ Not in Firebase | `displayName` | Add (from Google OAuth) |
| ❌ Not in Firebase | `profilePicture` | Add (from Google OAuth) |
| ❌ Not in Firebase | `googleId` | Add (from Google OAuth) |
| ❌ Not in Firebase | `provider: 'google'|'local'` | Add |

---

## 8️⃣ EXPRESS SERVER REQUIREMENTS

### Routes Needed

```javascript
// USER MANAGEMENT ROUTES (Admin only)

// 1. List all users
GET /api/users
Query params: ?page=1&limit=10&role=admin&status=active&search=john
Response: { success: true, users: [], count: 100, page: 1, totalPages: 10 }

// 2. Get single user
GET /api/users/:userId
Response: { success: true, user: {...} }

// 3. Update user status
PATCH /api/users/:userId/status
Body: { status: 'active' | 'inactive' | 'suspended' }
Response: { success: true, message: string, user: {...}, requiresLogout?: boolean }

// 4. Update user role
PATCH /api/users/:userId/role
Body: { role: 'admin' | 'staff' | 'user' }
Response: { success: true, message: string, user: {...}, requiresLogout?: boolean }

// 5. Update user profile
PATCH /api/users/:userId/profile
Body: { displayName?: string, firstName?: string, lastName?: string }
Response: { success: true, message: string, user: {...} }

// 6. Delete user
DELETE /api/users/:userId
Response: { success: true, message: string, userId: string }

// 7. Bulk operations (future)
POST /api/users/bulk-update
Body: { userIds: [], updates: {} }
```

### Middlewares Required

1. **Authentication Middleware** (`authMiddleware`)
   - Verify session cookie
   - Attach `req.user` with authenticated user data

2. **Admin Role Middleware** (`adminMiddleware`)
   - Verify `req.user.role === 'admin'`
   - Return 403 if not admin

3. **Validation Middleware** (`validateRequest`)
   - Validate request body schemas
   - Sanitize inputs

4. **Self-Modification Check**
   - Detect if admin is modifying their own account
   - Set `requiresLogout: true` in response if role/status changed

### Database Operations

```javascript
// MongoDB User Model
const UserSchema = new mongoose.Schema({
  googleId: String,
  email: { type: String, required: true, unique: true },
  displayName: String,
  firstName: String,
  lastName: String,
  profilePicture: String,
  role: { type: String, enum: ['admin', 'staff', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'inactive' },
  provider: { type: String, enum: ['google', 'local'], default: 'google' },
  lastLogin: Date,
}, { timestamps: true }); // Auto createdAt, updatedAt
```

---

## 9️⃣ CRITICAL COMPATIBILITY NOTES

### Status Value Mapping

**Client Expects (Firebase):**
```typescript
'Pending' | 'Approved' | 'Suspended'
```

**Server Has (MongoDB):**
```typescript
'active' | 'inactive' | 'suspended'
```

**Mapping:**
| Firebase | MongoDB |
|----------|---------|
| `'Pending'` | `'inactive'` |
| `'Approved'` | `'active'` |
| `'Suspended'` | `'suspended'` ✅ |

### Role Value Mapping

**Client Expects (Firebase):**
```typescript
'Admin' | 'Staff'
```

**Server Has (MongoDB):**
```typescript
'admin' | 'staff' | 'user'
```

**Mapping:**
| Firebase | MongoDB |
|----------|---------|
| `'Admin'` | `'admin'` (lowercase) |
| `'Staff'` | `'staff'` (lowercase) |
| ❌ N/A | `'user'` (new role) |

### Field Name Mapping

| Client Expects | Server Has | Action |
|----------------|------------|--------|
| `id` | `_id` | Transform response |
| `uuid` | `googleId` | Map or remove |
| `firstname` | `firstName` | Map |
| `lastname` | `lastName` | Map |
| `middlename` | ❌ N/A | Remove from client? |
| `department` | ❌ N/A | Remove from client? |
| `phoneNumber` | ❌ N/A | Remove from client? |

---

## 🔟 RECOMMENDED EXPRESS ENDPOINTS

### Implementation Priority

**Phase 1: Core CRUD (Required for Admin UI to function)**
- ✅ `GET /api/users` - List users with pagination/filters
- ✅ `GET /api/users/:userId` - Get single user
- ✅ `PATCH /api/users/:userId/status` - Update status
- ✅ `PATCH /api/users/:userId/role` - Update role
- ✅ `DELETE /api/users/:userId` - Delete user

**Phase 2: Profile Management**
- ⚠️ `PATCH /api/users/:userId/profile` - Update profile (if keeping firstname/lastname fields)

**Phase 3: Advanced Features (Optional)**
- `POST /api/users/bulk-update` - Bulk operations
- `GET /api/users/export` - Export to CSV/Excel
- `GET /api/users/activity-logs` - User activity tracking

---

## 📊 FINAL SUMMARY

### What Client Expects

1. **List Users:**
   - Real-time updates (current) → Polling or SSE (new)
   - Fields: `id`, `email`, `firstname`, `lastname`, `middlename`, `department`, `phoneNumber`, `role`, `status`, `createdAt`, `updatedAt`, `lastLogin`

2. **Update User Status:**
   - Endpoint: Cloud Function `updateStatus` → `PATCH /api/users/:userId/status`
   - Values: `'Pending'|'Approved'|'Suspended'` → `'inactive'|'active'|'suspended'`

3. **Update User Role:**
   - Endpoint: Cloud Function `updateUser` → `PATCH /api/users/:userId/role`
   - Values: `'Admin'|'Staff'` → `'admin'|'staff'|'user'`

4. **Update User Profile:**
   - Endpoint: Cloud Function `updateUserProfile` → `PATCH /api/users/:userId/profile`
   - Fields: `firstname`, `middlename`, `lastname`, `department`, `phoneNumber`

5. **Delete User:**
   - Endpoint: Cloud Function `deleteUser` → `DELETE /api/users/:userId`
   - Behavior: Hard delete (both Auth + Firestore) → Hard delete (MongoDB)

6. **Self-Modification Detection:**
   - Response must include `requiresLogout: true` when admin changes own role/status

### Next Steps

1. **Review this document** - Confirm all requirements are captured
2. **Compare with Express server** - Identify missing routes
3. **Build missing endpoints** - Implement user management routes
4. **Update client services** - Replace Firebase calls with Express API calls
5. **Test compatibility** - Ensure Admin UI works seamlessly

---

## 📝 NOTES

- **No password management** needed (Google OAuth only)
- **No email verification** needed (handled by Google)
- **No profile pictures** currently uploaded by users
- **Notification preferences** are stored in Firestore subcollection (may need migration strategy)
