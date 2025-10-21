# Routing & Authentication System Documentation

## 🎯 Overview

This application implements a comprehensive routing and authentication system with protected routes, role-based access control, and real-time status monitoring.

---

## 📁 File Structure

```
client/src/
├── contexts/
│   ├── AuthContext.tsx          # Authentication state management
│   └── index.ts                 # Context exports
├── components/
│   ├── ProtectedRoute.tsx       # Route protection components
│   ├── UserMenu.tsx             # User dropdown menu
│   └── layouts/
│       └── AdminLayout.tsx      # Admin layout with navigation
├── utils/
│   ├── authUtils.ts             # Auth helper functions
│   └── index.ts                 # Utils exports
├── router/
│   └── index.tsx                # Route configuration
├── pages/
│   ├── auth/
│   │   ├── GoogleAuth.tsx       # Login page
│   │   ├── AccountCompletion.tsx
│   │   ├── PendingApproval.tsx
│   │   └── AccountInactive.tsx
│   └── admin/
│       └── [admin pages...]
└── App.tsx                      # Root component with AuthProvider
```

---

## 🔐 Authentication Context

### `AuthContext.tsx`

Provides global authentication state using React Context API.

**Features:**
- Real-time Firebase Auth listener
- Real-time Firestore user profile listener
- Automatic status updates
- Computed authentication states

**Usage:**
```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { 
    user,           // Firebase User object
    userProfile,    // Firestore user profile
    loading,        // Loading state
    isAuthenticated,// Boolean
    isApproved,     // Boolean
    isPending,      // Boolean
    isSuspended,    // Boolean
    isAdmin,        // Boolean
    isStaff         // Boolean
  } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  return <div>Hello {userProfile?.firstname}!</div>;
}
```

**State Flow:**
```
User signs in → Firebase Auth updates
              ↓
AuthContext detects change
              ↓
Firestore listener starts
              ↓
UserProfile updates in real-time
              ↓
Components re-render automatically
```

---

## 🛡️ Protected Route Components

### 1. **PublicRoute**
Only accessible when NOT authenticated.

**Use Case:** Login page, public landing pages

```tsx
<PublicRoute>
  <GoogleAuth />
</PublicRoute>
```

**Behavior:**
- If user is logged in and approved → Redirect to dashboard
- If user is not logged in → Show page

---

### 2. **ProtectedRoute**
Requires authentication only.

**Use Case:** Profile pages, basic protected content

```tsx
<ProtectedRoute>
  <ProfilePage />
</ProtectedRoute>
```

**Behavior:**
- If not authenticated → Redirect to `/auth/login`
- If authenticated → Show page

---

### 3. **ApprovedRoute**
Requires authentication AND approved status.

**Use Case:** Staff dashboard, basic app features

```tsx
<ApprovedRoute>
  <StaffDashboard />
</ApprovedRoute>
```

**Behavior:**
- If not authenticated → Redirect to `/auth/login`
- If profile incomplete → Redirect to `/auth/complete-account`
- If status is "Pending" → Redirect to `/auth/pending-approval`
- If status is "Suspended" → Redirect to `/auth/account-inactive`
- If status is "Approved" → Show page

---

### 4. **AdminRoute**
Requires authentication, approved status, AND admin role.

**Use Case:** Admin panel, user management, system settings

```tsx
<AdminRoute>
  <AdminDashboard />
</AdminRoute>
```

**Behavior:**
- Same checks as ApprovedRoute
- Additionally checks if `role === "Admin"`
- If not admin → Show 403 error page
- If admin → Show page

---

### 5. **RoleRoute**
Requires specific role(s).

**Use Case:** Flexible role-based access

```tsx
<RoleRoute allowedRoles={["Admin", "Staff"]}>
  <SharedPage />
</RoleRoute>
```

**Behavior:**
- Checks authentication and approval
- Validates user role matches allowed roles
- If role not allowed → Show 403 error

---

## 🗺️ Route Configuration

### Route Structure

```tsx
// router/index.tsx

export const router = createBrowserRouter([
  // Public routes (login, etc.)
  {
    path: '/auth/login',
    element: <PublicRoute><GoogleAuth /></PublicRoute>
  },
  
  // Auth flow routes (no protection)
  {
    path: '/auth/complete-account',
    element: <AccountCompletion />
  },
  
  // Admin routes (requires Admin role)
  {
    path: '/admin/dashboard',
    element: <AdminRoute><AdminDashboard /></AdminRoute>
  },
  
  // Staff routes (requires approved status)
  {
    path: '/dashboard',
    element: <ApprovedRoute><StaffDashboard /></ApprovedRoute>
  }
]);
```

### Route Constants

```tsx
import { ROUTES } from './router';

// Navigate programmatically
navigate(ROUTES.ADMIN.DASHBOARD);
navigate(ROUTES.AUTH.LOGIN);

// Available routes:
ROUTES.HOME                    // '/'
ROUTES.ADMIN.DASHBOARD         // '/admin/dashboard'
ROUTES.ADMIN.DEVICES           // '/admin/devices'
ROUTES.ADMIN.USERS             // '/admin/users'
ROUTES.AUTH.LOGIN              // '/auth/login'
ROUTES.AUTH.COMPLETE_ACCOUNT   // '/auth/complete-account'
ROUTES.AUTH.PENDING_APPROVAL   // '/auth/pending-approval'
ROUTES.AUTH.ACCOUNT_INACTIVE   // '/auth/account-inactive'
ROUTES.STAFF.DASHBOARD         // '/dashboard'
```

---

## 🔄 Authentication Flow

### New User Journey

```
1. User visits /auth/login
2. Clicks "Sign in with Google"
3. Google OAuth popup
4. Firebase Auth creates user
   ├─ beforeCreate function runs (Cloud Function)
   │  └─ Creates user in Firestore with status: "Pending"
   └─ beforeSignIn function runs (Cloud Function)
      └─ Checks status → REJECTS (status is Pending)
5. Client handles rejection
6. Checks Firestore for user profile
7. Profile incomplete → Redirect to /auth/complete-account
8. User fills department & phone
9. Redirect to /auth/pending-approval
10. Real-time listener waits for status change
11. Admin approves (changes status to "Approved")
12. Listener detects change → Auto-redirect to /admin/dashboard
```

### Returning Approved User Journey

```
1. User visits /auth/login
2. Clicks "Sign in with Google"
3. Google OAuth
4. beforeSignIn checks status → APPROVED ✓
5. Auth token issued
6. Client checks user profile
7. Status is "Approved" → Redirect to dashboard
   ├─ If role = "Admin" → /admin/dashboard
   └─ If role = "Staff" → /dashboard
```

---

## 🎨 Components

### UserMenu Component

Displays user information and provides logout.

**Features:**
- User avatar with initials
- Display name and email
- Status and role badges
- Settings link
- Logout button

**Usage:**
```tsx
import UserMenu from '../components/UserMenu';

<Header>
  <UserMenu />
</Header>
```

**What it shows:**
```
┌─────────────────────────────┐
│ JD                          │ ← Avatar with initials
│ John Doe                    │ ← Display name
│ john@example.com            │ ← Email
│ ● Approved • Admin          │ ← Status & Role
├─────────────────────────────┤
│ ⚙️ Settings                 │
├─────────────────────────────┤
│ 🚪 Sign Out (red)           │
└─────────────────────────────┘
```

---

## 🛠️ Utility Functions

### `authUtils.ts`

```tsx
import { logout, getUserDisplayName, getUserInitials } from '../utils/authUtils';

// Sign out current user
await logout();

// Get display name
const name = getUserDisplayName(userProfile);
// Returns: "John Doe" or "John" or "User"

// Get initials for avatar
const initials = getUserInitials(userProfile);
// Returns: "JD" or "U"

// Get status color for Badge
const color = getStatusColor("Approved");
// Returns: "green" | "orange" | "red"

// Get role color for Badge
const color = getRoleColor("Admin");
// Returns: "blue" | "cyan"

// Check if profile is complete
const complete = isProfileComplete(userProfile);
// Returns: true if has department and phoneNumber
```

---

## 🔒 Security Features

### 1. **Server-Side Validation**
- Cloud Functions (beforeCreate, beforeSignIn) validate on server
- Cannot be bypassed by client manipulation

### 2. **Real-Time Status Monitoring**
- Status changes reflect immediately
- User redirected automatically when status changes

### 3. **Route Protection**
- Multiple layers of protection
- Authentication → Profile completion → Status check → Role check

### 4. **Token-Based Authentication**
- Firebase Auth tokens
- Automatic refresh
- Secure HTTP-only cookies (when configured)

---

## 📊 User States

```
┌──────────────────────────────────────────────────────────┐
│ USER STATE MATRIX                                         │
├──────────────────────────────────────────────────────────┤
│ State                  │ Can Access │ Redirected To       │
├──────────────────────────────────────────────────────────┤
│ Not Authenticated      │ Login only │ /auth/login         │
│ New User (no profile)  │ Complete   │ /auth/complete-...  │
│ Pending Approval       │ Wait page  │ /auth/pending-...   │
│ Suspended              │ Error page │ /auth/account-...   │
│ Approved (Staff)       │ Dashboard  │ /dashboard          │
│ Approved (Admin)       │ All pages  │ /admin/dashboard    │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Best Practices

### 1. **Always use `useAuth` hook**
```tsx
// ✅ Good
const { isAuthenticated, userProfile } = useAuth();

// ❌ Bad - don't access Firebase directly
const user = auth.currentUser;
```

### 2. **Use route constants**
```tsx
// ✅ Good
navigate(ROUTES.ADMIN.DASHBOARD);

// ❌ Bad - hardcoded paths
navigate('/admin/dashboard');
```

### 3. **Check loading state**
```tsx
const { loading, isAuthenticated } = useAuth();

if (loading) return <LoadingScreen />;

// Now safe to use isAuthenticated
```

### 4. **Handle all user states**
```tsx
if (!isAuthenticated) {
  return <Login />;
}

if (isPending) {
  return <PendingMessage />;
}

if (isSuspended) {
  return <SuspendedMessage />;
}

return <Dashboard />;
```

---

## 🧪 Testing Routes

### Test Protected Routes
```bash
# 1. Not logged in → Should redirect to login
Visit: /admin/dashboard
Expected: Redirects to /auth/login

# 2. Pending user → Should redirect to pending page
Sign in as pending user
Visit: /admin/dashboard
Expected: Redirects to /auth/pending-approval

# 3. Staff user → Should get 403 on admin routes
Sign in as staff
Visit: /admin/users
Expected: Shows "Access Denied" error

# 4. Admin user → Should access all routes
Sign in as admin
Visit: /admin/users
Expected: Shows page
```

---

## 🐛 Troubleshooting

### Issue: Infinite redirect loop
**Cause:** Route protection conflicts  
**Solution:** Check that auth flow routes don't have protection

### Issue: User stuck on loading
**Cause:** Firestore listener not resolving  
**Solution:** Check Firestore rules and user document exists

### Issue: 403 error for admin
**Cause:** Role not set correctly  
**Solution:** Check Firestore user document has `role: "Admin"`

### Issue: Not redirecting after approval
**Cause:** Real-time listener not active  
**Solution:** Ensure PendingApproval component is mounted

---

## 📚 Additional Resources

- **Firebase Auth Docs**: https://firebase.google.com/docs/auth
- **React Router Docs**: https://reactrouter.com/
- **Firestore Docs**: https://firebase.google.com/docs/firestore

---

**Implementation Date**: October 21, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
