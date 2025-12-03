/**
 * validation.util.ts - Centralized Validation Utilities
 * 
 * Single source of truth for all validation logic across the application.
 * Ensures consistency and maintainability.
 * 
 * @module utils/validation
 */

/**
 * Validates if an email belongs to the SMU domain
 * 
 * @param email - Email address to validate
 * @returns true if email ends with @smu.edu.ph
 * 
 * @example
 * ```ts
 * isValidSMUEmail('student@smu.edu.ph') // true
 * isValidSMUEmail('user@gmail.com')     // false
 * ```
 */
export const isValidSMUEmail = (email: string): boolean => {
  return email.endsWith('@smu.edu.ph');
};
