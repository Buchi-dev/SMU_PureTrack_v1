# 🔒 Authentication Security Fix - Personal Account Bypass Prevention

## Executive Summary

This document outlines the comprehensive fix implemented to address critical authentication vulnerabilities where personal Google accounts could bypass the SMU domain restriction (`@smu.edu.ph`), resulting in timeout errors and poor user experience.

---

## 🐛 Issues Resolved

### 1. **Personal Account Bypass Vulnerability**
- **Problem**: Firebase accepted any valid Google account, domain validation occurred too late
- **Impact**: Personal accounts received valid Firebase tokens, causing 30-second timeouts when backend rejected them
- **Solution**: Multi-layer domain validation with fast-fail pattern

### 2. **Poor Error Messaging**
- **Problem**: Users received technical "timeout of 30000ms exceeded" errors
- **Impact**: Confusing UX, users didn't understand why authentication failed
- **Solution**: Specific error codes and user-friendly messages

### 3. **Incomplete Session Cleanup**
- **Problem**: Firebase sessions persisted after domain validation failure
- **Impact**: Inconsistent authentication state, retry issues
- **Solution**: Atomic rollback with guaranteed Firebase sign-out

### 4. **Backend Processing Delays**
- **Problem**: Backend performed expensive operations before domain validation
- **Impact**: 30-second timeouts for unauthorized users
- **Solution**: Immediate domain validation before any database operations

---

## 🛡️ Security Architecture (Defense in Depth)

### Layer 1: Firebase Provider Configuration (Preference Hint)
**File**: `client/src/config/firebase.config.ts`

```typescript
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'smu.edu.ph', // Domain hint (not enforcement)
});
```

- **Purpose**: Suggests SMU domain during Google account selection
- **Limitation**: This is a UI hint only, not enforced by Google
- **Status**: Already implemented

### Layer 2: Frontend Pre-Validation (Fast Fail)
**File**: `client/src/services/auth.Service.ts`

```typescript
async loginWithGoogle(): Promise<VerifyTokenResponse> {
  let firebaseUserCredential = null;
  
  try {
    firebaseUserCredential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = firebaseUserCredential.user;

    // CRITICAL: Domain check BEFORE backend verification
    const email = firebaseUser.email;
    if (!email || !email.endsWith('@smu.edu.ph')) {
      // Immediate sign out to prevent session persistence
      await firebaseSignOut(auth);
      throw new Error('Access denied: Only SMU email addresses...');
    }

    // Continue with backend verification...
  } catch (error) {
    // GUARANTEED cleanup on ANY error
    if (firebaseUserCredential) {
      await firebaseSignOut(auth);
    }
    throw error;
  }
}
```

**Improvements**:
- ✅ Domain validation before backend call (saves 10-15 seconds)
- ✅ Atomic rollback with guaranteed Firebase sign-out
- ✅ Enhanced error messages for Firebase-specific errors
- ✅ User-friendly domain validation error message

### Layer 3: Backend Token Verification Endpoint (Primary Validation)
**File**: `server/src/auth/auth.Routes.js`

```javascript
router.post('/verify-token', async (req, res) => {
  const { idToken } = req.body;

  // Step 1: Verify Firebase token structure (fast)
  let decodedToken;
  try {
    decodedToken = await verifyIdToken(idToken);
  } catch (verifyError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired Firebase token',
      errorCode: 'AUTH_TOKEN_INVALID',
    });
  }

  // Step 2: IMMEDIATE domain validation BEFORE database operations
  const userEmail = decodedToken.email;
  if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
    logger.warn('[Auth] Domain validation failed', { email: userEmail });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed...',
      errorCode: 'AUTH_INVALID_DOMAIN',
      metadata: { email: userEmail, requiredDomain: '@smu.edu.ph' },
    });
  }

  // Step 3: Proceed with database sync only for valid domains
  // ...
});
```

**Improvements**:
- ✅ Fast-fail pattern: validate token → validate domain → database operations
- ✅ Specific error code `AUTH_INVALID_DOMAIN` for frontend handling
- ✅ Structured error response with metadata
- ✅ Prevents timeouts by rejecting before expensive operations

### Layer 4: Backend Middleware (Defense in Depth)
**File**: `server/src/auth/auth.Middleware.js`

```javascript
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    decodedToken = await verifyIdToken(idToken);
    
    // DEFENSE IN DEPTH: Validate domain even in middleware
    const userEmail = decodedToken.email;
    if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
      throw AuthenticationError.invalidDomain(userEmail);
    }
    
    // Continue with user lookup...
  } catch (error) {
    // ...
  }
});
```

**Purpose**: Catches tokens that bypass the verify-token endpoint (e.g., direct API calls)

---

## 📊 Error Handling Improvements

### 1. New Error Code
**File**: `server/src/errors/errorCodes.js`

```javascript
AUTH_INVALID_DOMAIN: 'AUTH_1008',
```

### 2. New Error Class Method
**File**: `server/src/errors/AuthenticationError.js`

```javascript
static invalidDomain(email = '') {
  return new AuthenticationError(
    'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed...',
    ERROR_CODES.AUTH_INVALID_DOMAIN,
    { email, requiredDomain: '@smu.edu.ph' }
  );
}
```

### 3. Frontend Error Detection
**File**: `client/src/config/api.config.ts`

```typescript
// Response interceptor - handle domain errors before 401 handling
if (status === 403 && data.errorCode === 'AUTH_INVALID_DOMAIN') {
  console.error('[API] Domain validation failed:', data.message);
  return Promise.reject(error); // Let component handle it
}
```

**File**: `client/src/config/api.config.ts` - Enhanced getErrorMessage

```typescript
export const getErrorMessage = (error: unknown): string => {
  // Check for domain validation error
  if (err.response?.data?.errorCode === 'AUTH_INVALID_DOMAIN') {
    return err.response.data.message || 
      'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed...';
  }
  
  // Handle timeout errors specifically
  if (err.code === 'ECONNABORTED' && err.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  // ... other error handling
};
```

---

## ⏱️ Timeout Optimizations

### 1. Reduced Default Timeout (Fast-Fail for Auth)
**File**: `client/src/config/api.config.ts`

```typescript
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 seconds (reduced from 30s)
});
```

**Rationale**: Authentication should fail fast; 10 seconds is sufficient for auth operations

### 2. Extended Timeout for Token Verification
**File**: `client/src/services/auth.Service.ts`

```typescript
async verifyToken(idToken: string): Promise<VerifyTokenResponse> {
  const response = await apiClient.post(
    AUTH_ENDPOINTS.VERIFY_TOKEN,
    { idToken },
    {
      headers: { 'Authorization': `Bearer ${idToken}` },
      timeout: 15000, // 15 seconds for backend verification
    }
  );
}
```

**Rationale**: Token verification includes database sync, needs slightly more time

### 3. Extended Timeout for Reports
**File**: `client/src/services/reports.Service.ts`

```typescript
async generateWaterQualityReport(request): Promise<ReportResponse> {
  const response = await apiClient.post(
    REPORT_ENDPOINTS.WATER_QUALITY,
    request,
    {
      timeout: 30000, // 30 seconds for report generation
    }
  );
}
```

**Rationale**: Report generation involves complex aggregations, requires more time

---

## 🎯 User Experience Improvements

### Before Fix
1. ❌ User logs in with personal Gmail
2. ❌ Google OAuth succeeds (confusing)
3. ❌ 30-second loading spinner
4. ❌ "Server Timeout 30000ms exceeded" error
5. ❌ Firebase session persists, causing retry issues
6. ❌ No guidance on what went wrong

### After Fix
1. ✅ User logs in with personal Gmail
2. ✅ Firebase validates (instant)
3. ✅ Domain check fails (< 1 second)
4. ✅ Clear error: "Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted."
5. ✅ Firebase session cleaned up automatically
6. ✅ User knows exactly what to do (use SMU email)

---

## 🧪 Testing Checklist

### Scenario 1: Personal Account Rejection
- [ ] Login with @gmail.com account
- [ ] Verify error appears within 2 seconds
- [ ] Verify error message mentions "@smu.edu.ph"
- [ ] Verify Firebase session is cleaned up
- [ ] Verify subsequent login attempts work correctly

### Scenario 2: Valid SMU Account
- [ ] Login with @smu.edu.ph account
- [ ] Verify authentication succeeds
- [ ] Verify user profile loads correctly
- [ ] Verify token refresh works

### Scenario 3: Backend Validation
- [ ] Attempt to call protected endpoint with personal account token
- [ ] Verify middleware rejects with AUTH_INVALID_DOMAIN
- [ ] Verify request fails within 10 seconds

### Scenario 4: Timeout Handling
- [ ] Generate a water quality report
- [ ] Verify timeout is 30 seconds (not 10)
- [ ] Verify normal API calls timeout at 10 seconds

---

## 📝 Files Modified

### Backend (4 files)
1. `server/src/errors/errorCodes.js` - Added AUTH_INVALID_DOMAIN
2. `server/src/errors/AuthenticationError.js` - Added invalidDomain() method
3. `server/src/auth/auth.Routes.js` - Restructured verify-token with fast-fail
4. `server/src/auth/auth.Middleware.js` - Added defense-in-depth domain validation

### Frontend (4 files)
1. `client/src/config/api.config.ts` - Reduced timeout, enhanced error handling
2. `client/src/services/auth.Service.ts` - Atomic rollback, better error messages
3. `client/src/services/reports.Service.ts` - Extended timeout for report generation
4. `client/src/config/firebase.config.ts` - Already had domain hint (no changes needed)

---

## 🚀 Deployment Steps

1. **Backend Deployment**
   ```bash
   cd server
   npm install  # If any new dependencies
   npm run dev  # Test locally
   # Deploy to production
   ```

2. **Frontend Deployment**
   ```bash
   cd client
   npm install  # If any new dependencies
   npm run dev  # Test locally
   firebase deploy  # Deploy to Firebase Hosting
   ```

3. **Verification**
   - Test personal account rejection
   - Test valid SMU account login
   - Monitor backend logs for domain validation warnings
   - Verify error messages are user-friendly

---

## 🔍 Monitoring & Logging

### Backend Logs to Monitor
```javascript
logger.warn('[Auth] Domain validation failed - personal account rejected', {
  email: userEmail,
  requiredDomain: '@smu.edu.ph',
});
```

### Frontend Console Messages
```javascript
console.warn('[AuthService] Domain validation failed - personal account detected:', email);
console.log('[AuthService] Firebase session cleaned up after error');
```

---

## 🎓 Key Takeaways

1. **Defense in Depth**: Multiple validation layers catch edge cases
2. **Fast-Fail Pattern**: Reject invalid requests early to prevent timeouts
3. **User-Friendly Errors**: Specific error codes with clear messages
4. **Atomic Operations**: Guaranteed cleanup on failures
5. **Performance Optimization**: Different timeouts for different operation types

---

## 📚 Related Documentation

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google OAuth Domain Restriction](https://developers.google.com/identity/protocols/oauth2)
- [Express Error Handling Best Practices](https://expressjs.com/en/guide/error-handling.html)
- [Axios Request Configuration](https://axios-http.com/docs/req_config)

---

**Document Version**: 1.0  
**Last Updated**: November 27, 2025  
**Author**: GitHub Copilot  
**Status**: ✅ Implementation Complete
