/**
 * Authentication Helper Utilities
 * 
 * ⚠️ DEPRECATED - This file is no longer used after migration to Express REST API.
 * 
 * All authentication is now handled by:
 * - authService (services/auth.Service.ts) - For login/logout operations
 * - AuthContext (contexts/AuthContext.tsx) - For auth state management
 * 
 * Session-based authentication replaces Firebase token-based auth.
 * 
 * @deprecated Use authService and AuthContext instead
 */

/**
 * @deprecated Firebase auth is no longer used. Use authService.logout() instead.
 */

/**
 * @deprecated Use authService.getStatus() to verify session instead
 */
export async function refreshUserToken(): Promise<string> {
  throw new Error(
    'refreshUserToken() is deprecated. Use authService.getStatus() to verify session.'
  );
}

/**
 * @deprecated Use AuthContext.userProfile to access user data instead
 */
export async function getUserTokenClaims(): Promise<any> {
  throw new Error(
    'getUserTokenClaims() is deprecated. Use AuthContext.userProfile to access user data.'
  );
}

/**
 * @deprecated Use AuthContext.isAdmin to check admin status instead
 */
export async function isAdminInToken(): Promise<boolean> {
  throw new Error(
    'isAdminInToken() is deprecated. Use AuthContext.isAdmin to check admin status.'
  );
}

/**
 * @deprecated Use browser dev tools to inspect session cookies instead
 */
export async function logAuthDebugInfo(): Promise<void> {
  console.warn(
    'logAuthDebugInfo() is deprecated. Use browser dev tools to inspect session cookies.'
  );
}

/**
 * @deprecated Use authService.getStatus() to verify session and AuthContext for role checking
 */
export async function refreshAndVerifyAdmin(): Promise<{
  success: boolean;
  isAdmin: boolean;
  role: string;
  message: string;
}> {
  throw new Error(
    'refreshAndVerifyAdmin() is deprecated. Use authService.getStatus() and AuthContext.isAdmin instead.'
  );
}
