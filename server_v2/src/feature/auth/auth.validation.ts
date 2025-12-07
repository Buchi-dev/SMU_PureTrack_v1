/**
 * Auth Validation Schemas
 * Zod schemas for validating authentication-related requests
 * 
 * @module feature/auth/auth.validation
 */

import { z } from 'zod';

/**
 * Phone number validation regex
 * Supports formats: +639171234567, 09171234567, 9171234567
 */
const phoneRegex = /^(\+63|0)?9\d{9}$/;

/**
 * Complete Account Request Schema
 * Validates data submitted when user completes their account registration
 */
export const completeAccountSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name must be 50 characters or less')
      .regex(/^[a-zA-Z\s\-'.]+$/, 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be 50 characters or less')
      .regex(/^[a-zA-Z\s\-'.]+$/, 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
    middleName: z.string()
      .max(50, 'Middle name must be 50 characters or less')
      .regex(/^[a-zA-Z\s\-'.]*$/, 'Middle name can only contain letters, spaces, hyphens, apostrophes, and periods')
      .optional()
      .or(z.literal('')),
    
    department: z.string()
      .min(1, 'Department is required')
      .max(100, 'Department must be 100 characters or less'),
    
    phoneNumber: z.string()
      .regex(phoneRegex, 'Invalid phone number format. Use +639171234567 or 09171234567'),
    
    roleRequest: z.enum(['admin', 'staff'])
      .refine((val) => val === 'admin' || val === 'staff', {
        message: 'Role must be either "admin" or "staff"'
      }),
    
    // Optional notification preferences
    notificationPreferences: z.object({
      emailNotifications: z.boolean().default(true),
      pushNotifications: z.boolean().default(true),
      sendScheduledAlerts: z.boolean().default(false),
      alertSeverities: z.array(z.enum(['Critical', 'Warning', 'Advisory'])).default(['Critical']),
      parameters: z.array(z.enum(['pH', 'Turbidity', 'TDS'])).default(['pH', 'Turbidity', 'TDS']),
      devices: z.array(z.string()).default([]),
      quietHoursEnabled: z.boolean().default(false),
      quietHoursStart: z.string().default('22:00'),
      quietHoursEnd: z.string().default('07:00'),
    }).optional()
  })
});

/**
 * Verify Token Request Schema
 */
export const verifyTokenSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'ID token is required')
  })
});

export type CompleteAccountData = z.infer<typeof completeAccountSchema>['body'];
