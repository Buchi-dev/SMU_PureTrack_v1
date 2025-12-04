# Registration Flow Fix - Delayed User Creation

## Problem Statement

Users were being created in the database during initial Firebase login, before completing the account registration form. This resulted in:

- **Incomplete user records** with missing department, phone number, and other required fields
- **Broken approval workflow** - admins seeing pending users with incomplete information
- **Database integrity issues** - required fields being null or having default values
- **No distinction** between "started registration" and "completed registration pending approval"
- **Abandoned registrations** cluttering the database

## Solution Overview

Implemented **delayed database creation** - users are NOT created in the MongoDB database until they complete the account registration form. This ensures:

✅ Only complete user records exist in the database  
✅ Clean user approval workflow for admins  
✅ Database integrity maintained  
✅ No orphaned or incomplete records  
✅ Clear distinction between Firebase authentication and application registration

## Implementation Details

### Backend Changes (Server V2)

#### 1. Updated Auth Controller (`auth.controller.ts`)

**Modified `verifyToken` endpoint:**
- No longer auto-creates users in database
- Verifies Firebase token only
- Returns `requiresAccountCompletion: true` flag when user doesn't exist in database
- Returns user data if user exists

```typescript
// Before: Auto-created user immediately
if (!user) {
  user = await userService.createUser({ ... });
}

// After: Return flag indicating completion needed
if (!user) {
  ResponseHandler.success(res, { 
    requiresAccountCompletion: true,
    firebaseEmail: decodedToken.email,
    firebaseUid: decodedToken.uid
  });
  return;
}
```

**Added `completeAccount` endpoint:**
- New POST `/auth/complete-account` endpoint
- Accepts complete user profile data with Zod validation
- Verifies Firebase token in Authorization header
- Creates user in database with `status: 'pending'` for admin approval
- Only endpoint that creates new users

**Modified `checkAuthStatus` endpoint:**
- Returns `requiresAccountCompletion: true` when Firebase authenticated but no database record
- Allows frontend to redirect to account completion page

#### 2. Created Validation Schema (`auth.validation.ts`)

New Zod schema for account completion:
- `firstName`, `lastName`, `middleName` - Name validation with regex
- `department` - Required department selection
- `phoneNumber` - Philippine phone number format validation
- `roleRequest` - Admin or staff role request (enum validation)
- `notificationPreferences` - Optional notification settings

#### 3. Updated Auth Routes (`auth.routes.ts`)

Added new route:
```typescript
router.post('/complete-account', 
  validateRequest(completeAccountSchema), 
  completeAccount
);
```

### Frontend Changes (Client)

#### 1. Updated Auth Service Types (`auth.Service.ts`)

**Extended response interfaces:**
```typescript
export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
  requiresAccountCompletion?: boolean;  // NEW
  firebaseEmail?: string;                // NEW
}

export interface VerifyTokenResponse {
  success: boolean;
  user?: AuthUser;                       // Now optional
  message: string;
  requiresAccountCompletion?: boolean;   // NEW
  firebaseEmail?: string;                // NEW
  firebaseUid?: string;                  // NEW
}
```

**Added `completeAccount` method:**
```typescript
async completeAccount(accountData: CompleteAccountData): Promise<CompleteAccountResponse> {
  const firebaseUser = auth.currentUser;
  const idToken = await firebaseUser.getIdToken();
  
  return await apiClient.post('/auth/complete-account', accountData, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
}
```

#### 2. Updated Auth Context (`AuthContext.tsx`, `auth.context.ts`)

**Added new state fields:**
```typescript
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  requiresAccountCompletion: boolean;  // NEW
  firebaseEmail: string | null;        // NEW
  refetchUser: () => Promise<void>;
  // ... other fields
}
```

**Updated `fetchUser` logic:**
```typescript
const response = await authService.checkStatus();

if (response.requiresAccountCompletion) {
  setRequiresAccountCompletion(true);
  setFirebaseEmail(response.firebaseEmail || null);
  setUser(null);
} else if (response.authenticated && response.user) {
  setUser(response.user);
  setRequiresAccountCompletion(false);
}
```

#### 3. Updated Auth Login (`AuthLogin.tsx`)

**Modified login flow:**
```typescript
const response = await authService.loginWithGoogle();
await refetchUser();

// Check if account completion is required
if (response.requiresAccountCompletion) {
  navigate('/auth/account-completion');
  return;
}

// User exists, navigate based on status
if (response.user) {
  if (user.status === 'pending') {
    navigate('/auth/pending-approval');
  } else if (user.status === 'active') {
    navigate('/admin/dashboard' or '/staff/dashboard');
  }
}
```

#### 4. Updated Account Completion Page (`AuthAccountCompletion.tsx`)

**Complete rewrite to use new flow:**
- Removed dependency on existing user record
- Uses `firebaseEmail` from AuthContext instead of `user.email`
- Calls `authService.completeAccount()` instead of user update mutation
- Added `roleRequest` field to form (admin or staff selection)
- Shows "Registering as:" instead of "Logged in as:"
- Navigates to pending approval after successful submission

**New form submission:**
```typescript
const handleSubmit = async (values) => {
  const accountData: CompleteAccountData = {
    firstName: values.firstName,
    lastName: values.lastName,
    middleName: values.middleName,
    department: values.department,
    phoneNumber: values.phoneNumber,
    roleRequest: values.roleRequest,  // NEW - user selects role
  };

  await authService.completeAccount(accountData);
  await refetchUser();
  navigate("/auth/pending-approval");
};
```

#### 5. Updated Endpoints Config (`endpoints.ts`)

Added new endpoint constant:
```typescript
export const AUTH_ENDPOINTS = {
  VERIFY_TOKEN: '/auth/verify-token',
  COMPLETE_ACCOUNT: '/auth/complete-account',  // NEW
  CURRENT_USER: '/auth/current-user',
  STATUS: '/auth/status',
  LOGOUT: '/auth/logout',
} as const;
```

## Complete User Flow

### New User Registration Flow

1. **User clicks "Sign in with Google"**
   - Firebase authenticates user
   - Frontend calls `/auth/verify-token`

2. **Backend verifies token**
   - Checks if user exists in database
   - Returns `{ requiresAccountCompletion: true }` if not found

3. **Frontend redirects to `/auth/account-completion`**
   - User fills out complete registration form
   - Includes: name, department, phone, role request
   - Form submits to `/auth/complete-account`

4. **Backend creates user**
   - Validates all required fields with Zod
   - Creates user with `status: 'pending'`
   - User now exists in database with complete profile

5. **Frontend redirects to `/auth/pending-approval`**
   - User waits for admin approval
   - No incomplete records in database

### Existing User Login Flow

1. **User signs in with Google**
   - Firebase authenticates
   - Frontend calls `/auth/verify-token`

2. **Backend finds existing user**
   - Returns `{ requiresAccountCompletion: false, user: {...} }`

3. **Frontend navigates based on status**
   - `pending` → `/auth/pending-approval`
   - `active` → `/admin/dashboard` or `/staff/dashboard`
   - `suspended` → `/auth/account-suspended`

## Database Impact

### Before Fix
```
User Collection:
- user1: { email: "...", displayName: "...", status: "pending" } ❌ No department
- user2: { email: "...", status: "pending" } ❌ No phone number
- user3: { email: "...", displayName: "...", status: "pending" } ❌ Incomplete
```

### After Fix
```
User Collection:
- user1: { 
    email: "...", 
    firstName: "John",
    lastName: "Doe",
    department: "IT",
    phoneNumber: "09171234567",
    role: "staff",
    status: "pending" 
  } ✅ Complete profile
```

## Benefits

1. **Clean Database**: Only complete user records exist
2. **Better UX**: Clear registration process with all steps
3. **Admin-Friendly**: Admins only see fully-completed pending approvals
4. **Data Integrity**: All required fields guaranteed to be present
5. **No Orphaned Records**: Abandoned registrations don't create database entries
6. **Role-Based Approval**: Admins can see what role user requested
7. **Scalable**: Easy to add more required fields in future

## Testing Checklist

- [ ] New user signs in with Google → redirected to account completion
- [ ] Complete account form with all fields → user created with pending status
- [ ] Existing pending user signs in → redirected to pending approval page
- [ ] Existing active user signs in → redirected to dashboard
- [ ] Form validation works (phone number format, required fields)
- [ ] Role request dropdown shows admin and staff options
- [ ] Firebase email displayed correctly on completion form
- [ ] Error handling works (network errors, validation errors)
- [ ] User can't skip account completion by navigating directly
- [ ] Admin sees only complete user records in user management

## Migration Notes

### For Existing Incomplete Users

If you have existing incomplete users in the database, you have two options:

**Option 1: Clean Slate (Recommended)**
```javascript
// Delete all incomplete pending users
db.users.deleteMany({
  status: 'pending',
  $or: [
    { department: { $exists: false } },
    { phoneNumber: { $exists: false } },
    { firstName: { $exists: false } },
    { lastName: { $exists: false } }
  ]
});
```

**Option 2: Mark for Completion**
```javascript
// Add a flag to existing incomplete users
db.users.updateMany(
  {
    status: 'pending',
    $or: [
      { department: { $exists: false } },
      { phoneNumber: { $exists: false } }
    ]
  },
  {
    $set: { requiresProfileCompletion: true }
  }
);
```

## Files Changed

### Backend (Server V2)
- ✅ `src/feature/auth/auth.controller.ts` - Modified verifyToken, checkAuthStatus, added completeAccount
- ✅ `src/feature/auth/auth.routes.ts` - Added complete-account route
- ✅ `src/feature/auth/auth.validation.ts` - **NEW FILE** - Zod validation schemas

### Frontend (Client)
- ✅ `src/services/auth.Service.ts` - Updated types, added completeAccount method
- ✅ `src/config/endpoints.ts` - Added COMPLETE_ACCOUNT endpoint
- ✅ `src/contexts/auth.context.ts` - Added requiresAccountCompletion and firebaseEmail fields
- ✅ `src/contexts/AuthContext.tsx` - Updated fetchUser logic to handle new flags
- ✅ `src/pages/auth/AuthLogin/AuthLogin.tsx` - Updated login flow routing
- ✅ `src/pages/auth/AuthAccountCompletion/AuthAccountCompletion.tsx` - Complete rewrite for new flow

## API Reference

### POST /auth/complete-account

**Request:**
```typescript
Headers:
  Authorization: Bearer <firebase-id-token>

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Smith",        // Optional
  "department": "IT",
  "phoneNumber": "09171234567",
  "roleRequest": "staff",       // "admin" or "staff"
  "notificationPreferences": {  // Optional
    "emailNotifications": true,
    "pushNotifications": true,
    // ... more preferences
  }
}
```

**Response (Success):**
```typescript
{
  "status": "success",
  "message": "Account registration completed successfully. Your account is pending admin approval.",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@smu.edu.ph",
      "firstName": "John",
      "lastName": "Doe",
      "department": "IT",
      "phoneNumber": "09171234567",
      "role": "staff",
      "status": "pending",
      // ... other fields
    }
  }
}
```

**Response (Validation Error):**
```typescript
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "path": "body.phoneNumber",
      "message": "Invalid phone number format"
    }
  ]
}
```

## Conclusion

This fix fundamentally improves the user registration flow by ensuring database integrity and providing a clean admin approval workflow. Users are only created in the database after providing all required information, eliminating incomplete records and making the system more maintainable and scalable.
