# React Router Implementation Guide

## Overview

This application uses **React Router v6** with the modern `createBrowserRouter` API for client-side routing. The routing system provides navigation between different pages in the admin panel.

## Installation

```bash
npm install react-router-dom
npm install -D @types/react-router-dom
```

## File Structure

```
src/
├── router/
│   └── index.tsx              # Route configuration
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx   # Dashboard page
│       ├── DeviceManagement/    # Device management
│       ├── Analytics.tsx        # Analytics page
│       ├── UserManagement.tsx   # User management
│       ├── Reports.tsx          # Reports page
│       └── Settings.tsx         # Settings page
├── components/
│   └── layouts/
│       └── AdminLayout.tsx      # Layout with navigation
└── App.tsx                      # Root component
```

## Routes Configuration

### Available Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect | Redirects to `/admin/dashboard` |
| `/admin` | Redirect | Redirects to `/admin/dashboard` |
| `/admin/dashboard` | AdminDashboard | Main dashboard |
| `/admin/devices` | DeviceManagement | Device CRUD operations |
| `/admin/analytics` | Analytics | Analytics & insights |
| `/admin/users` | UserManagement | User management |
| `/admin/reports` | Reports | System reports |
| `/admin/settings` | Settings | Application settings |
| `*` | 404 Page | Fallback for unknown routes |

### Route Constants

Use the `ROUTES` object for type-safe navigation:

```typescript
import { ROUTES } from './router';

// Navigate programmatically
navigate(ROUTES.ADMIN.DEVICES);
navigate(ROUTES.ADMIN.DASHBOARD);
```

Available constants:
```typescript
ROUTES = {
  HOME: '/',
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
    DEVICES: '/admin/devices',
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
  },
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
}
```

## Navigation Methods

### 1. Using Sidebar Menu

The `AdminLayout` component automatically handles navigation when menu items are clicked:

```tsx
// Clicking "Devices" in sidebar navigates to /admin/devices
// Clicking "Dashboard" navigates to /admin/dashboard
```

### 2. Programmatic Navigation

Use the `useNavigate` hook:

```tsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../router';

function MyComponent() {
  const navigate = useNavigate();

  const goToDevices = () => {
    navigate(ROUTES.ADMIN.DEVICES);
  };

  return <button onClick={goToDevices}>Go to Devices</button>;
}
```

### 3. Link Components

Use the `Link` component for declarative navigation:

```tsx
import { Link } from 'react-router-dom';
import { ROUTES } from '../router';

function MyComponent() {
  return (
    <Link to={ROUTES.ADMIN.DEVICES}>
      View Devices
    </Link>
  );
}
```

### 4. Navigation with State

Pass state during navigation:

```tsx
navigate(ROUTES.ADMIN.DEVICES, { 
  state: { fromDashboard: true } 
});

// Access in target component
const location = useLocation();
const { fromDashboard } = location.state || {};
```

## AdminLayout Integration

The `AdminLayout` component is integrated with React Router:

### Features

1. **Active Menu Highlighting**
   - Automatically highlights the current page in the sidebar
   - Updates based on current route

2. **Route-Based Navigation**
   - Menu clicks trigger navigation
   - URL changes update menu selection

3. **Implementation**

```tsx
import { useNavigate, useLocation } from 'react-router-dom';

// Track selected menu item
const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
const navigate = useNavigate();
const location = useLocation();

// Update selection based on route
useEffect(() => {
  const path = location.pathname;
  if (path.includes('/devices')) {
    setSelectedKeys(['devices']);
  } else if (path.includes('/dashboard')) {
    setSelectedKeys(['dashboard']);
  }
  // ... more conditions
}, [location.pathname]);

// Handle menu clicks
const handleMenuClick: MenuProps['onClick'] = (e) => {
  const routeMap = {
    dashboard: ROUTES.ADMIN.DASHBOARD,
    devices: ROUTES.ADMIN.DEVICES,
    // ... more mappings
  };
  navigate(routeMap[e.key]);
};
```

## Common Use Cases

### 1. Navigate After Action

```tsx
const handleSaveDevice = async () => {
  await api.addDevice(deviceData);
  message.success('Device added!');
  navigate(ROUTES.ADMIN.DEVICES);
};
```

### 2. Conditional Navigation

```tsx
const handleLogin = async () => {
  const success = await login(credentials);
  if (success) {
    navigate(ROUTES.ADMIN.DASHBOARD);
  }
};
```

### 3. Back Navigation

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  return (
    <button onClick={() => navigate(-1)}>
      Go Back
    </button>
  );
}
```

### 4. Replace Navigation (No History)

```tsx
// Navigate without adding to history
navigate(ROUTES.ADMIN.DASHBOARD, { replace: true });
```

### 5. External Links

```tsx
// For external links, use regular anchor tags
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  External Link
</a>
```

## Route Parameters (Future)

For dynamic routes with parameters:

```tsx
// In router config
{
  path: '/admin/devices/:deviceId',
  element: <DeviceDetails />,
}

// Navigate with parameter
navigate(`/admin/devices/${deviceId}`);

// Access parameter in component
import { useParams } from 'react-router-dom';

function DeviceDetails() {
  const { deviceId } = useParams();
  // Use deviceId
}
```

## Query Parameters

```tsx
// Navigate with query params
navigate('/admin/devices?status=online&type=sensor');

// Access query params
import { useSearchParams } from 'react-router-dom';

function DeviceList() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status'); // 'online'
  const type = searchParams.get('type'); // 'sensor'
}
```

## Protected Routes (Future Implementation)

For authentication-based routing:

```tsx
// Create ProtectedRoute component
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }
  
  return children;
}

// Use in router
{
  path: '/admin/dashboard',
  element: (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  ),
}
```

## Error Handling

### 404 Page

The router includes a fallback route for unknown URLs:

```tsx
{
  path: '*',
  element: <NotFoundPage />,
}
```

### Navigation Guards

Add checks before navigation:

```tsx
const handleNavigate = () => {
  if (hasUnsavedChanges) {
    Modal.confirm({
      title: 'Unsaved changes',
      content: 'You have unsaved changes. Continue?',
      onOk: () => navigate(ROUTES.ADMIN.DASHBOARD),
    });
  } else {
    navigate(ROUTES.ADMIN.DASHBOARD);
  }
};
```

## Best Practices

1. **Use Route Constants**
   ```tsx
   // ✅ Good
   navigate(ROUTES.ADMIN.DEVICES);
   
   // ❌ Bad
   navigate('/admin/devices');
   ```

2. **Handle Loading States**
   ```tsx
   const [loading, setLoading] = useState(false);
   
   const handleNavigate = async () => {
     setLoading(true);
     await saveData();
     setLoading(false);
     navigate(ROUTES.ADMIN.DASHBOARD);
   };
   ```

3. **Clear State on Navigation**
   ```tsx
   useEffect(() => {
     return () => {
       // Cleanup on unmount
       clearState();
     };
   }, []);
   ```

4. **Use Redirects for Authentication**
   ```tsx
   if (!isLoggedIn) {
     return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
   }
   ```

5. **Lazy Load Routes**
   ```tsx
   import { lazy, Suspense } from 'react';
   
   const DeviceManagement = lazy(() => import('./pages/admin/DeviceManagement'));
   
   {
     path: '/admin/devices',
     element: (
       <Suspense fallback={<Spin />}>
         <DeviceManagement />
       </Suspense>
     ),
   }
   ```

## Testing Navigation

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

test('navigates to devices page', () => {
  render(
    <MemoryRouter initialEntries={['/admin/devices']}>
      <App />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Device Management')).toBeInTheDocument();
});
```

## Troubleshooting

### Issue: Page Not Updating
**Solution:** Check if `selectedKeys` state is updating in AdminLayout

### Issue: Navigation Not Working
**Solution:** Ensure `RouterProvider` is wrapping the app in `App.tsx`

### Issue: 404 on Refresh
**Solution:** Configure server to serve `index.html` for all routes

### Issue: Menu Not Highlighting
**Solution:** Check `useEffect` in `AdminLayout` that updates `selectedKeys`

## Future Enhancements

- [ ] Add route-based breadcrumbs
- [ ] Implement route permissions
- [ ] Add route transitions/animations
- [ ] Create nested routes for sub-pages
- [ ] Add route preloading
- [ ] Implement route-based code splitting
- [ ] Add scroll restoration
- [ ] Create custom navigation hooks

## Resources

- [React Router Documentation](https://reactrouter.com/)
- [Data Router Tutorial](https://reactrouter.com/en/main/routers/create-browser-router)
- [Navigation Guide](https://reactrouter.com/en/main/start/concepts)

---

**🎉 Routing System Complete!**

Your application now has a full routing system with:
- ✅ Multiple pages
- ✅ Sidebar navigation
- ✅ Active route highlighting
- ✅ Programmatic navigation
- ✅ 404 fallback
- ✅ Type-safe route constants
