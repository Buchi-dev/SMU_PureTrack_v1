/**
 * Alerts Service
 * 
 * Provides API functions for alert management operations
 * Communicates with Firebase Callable Function: alertManagement
 * 
 * @module services/alertsService
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  WaterQualityAlert,
  AlertFilters,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  ListAlertsRequest,
  AlertResponse,
} from '../schemas';

// ============================================================================
// ERROR RESPONSE TYPE
// ============================================================================

/**
 * Generic error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// ALERTS SERVICE
// ============================================================================

/**
 * Alerts Service Class
 * Provides methods to interact with the alertManagement Firebase Callable Function
 */
export class AlertsService {
  private functions;
  private functionName = 'alertManagement';

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * Acknowledge an alert
   * 
   * Changes alert status from Active to Acknowledged.
   * Requires admin authentication.
   * 
   * @param {string} alertId - The ID of the alert to acknowledge
   * 
   * @returns {Promise<void>}
   * 
   * @throws {ErrorResponse} If alert is not found
   * @throws {ErrorResponse} If alert is already acknowledged or resolved
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new AlertsService();
   * try {
   *   await service.acknowledgeAlert('alert_12345');
   *   console.log('Alert acknowledged successfully');
   * } catch (error) {
   *   console.error('Failed to acknowledge alert:', error);
   * }
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const callable = httpsCallable<AcknowledgeAlertRequest, AlertResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'acknowledgeAlert',
        alertId,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to acknowledge alert');
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to acknowledge alert');
    }
  }

  /**
   * Resolve an alert
   * 
   * Changes alert status to Resolved with optional resolution notes.
   * Requires admin authentication.
   * 
   * @param {string} alertId - The ID of the alert to resolve
   * @param {string} [notes] - Optional resolution notes
   * 
   * @returns {Promise<void>}
   * 
   * @throws {ErrorResponse} If alert is not found
   * @throws {ErrorResponse} If alert is already resolved
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new AlertsService();
   * try {
   *   await service.resolveAlert('alert_12345', 'Issue fixed by replacing sensor');
   *   console.log('Alert resolved successfully');
   * } catch (error) {
   *   console.error('Failed to resolve alert:', error);
   * }
   */
  async resolveAlert(alertId: string, notes?: string): Promise<void> {
    try {
      const callable = httpsCallable<ResolveAlertRequest, AlertResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'resolveAlert',
        alertId,
        notes,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to resolve alert');
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to resolve alert');
    }
  }

  /**
   * List alerts with optional filters
   * 
   * Retrieves alerts from the backend with server-side filtering.
   * Requires admin authentication.
   * 
   * @param {AlertFilters} [filters] - Optional filters for alerts
   * 
   * @returns {Promise<WaterQualityAlert[]>} Array of alerts
   * 
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new AlertsService();
   * try {
   *   const alerts = await service.listAlerts({
   *     status: ['Active', 'Acknowledged'],
   *     severity: ['Critical']
   *   });
   *   console.log(`Found ${alerts.length} alerts`);
   * } catch (error) {
   *   console.error('Failed to list alerts:', error);
   * }
   */
  async listAlerts(filters?: AlertFilters): Promise<WaterQualityAlert[]> {
    try {
      const callable = httpsCallable<ListAlertsRequest, AlertResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'listAlerts',
        filters,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to list alerts');
      }

      return result.data.alerts || [];
    } catch (error: any) {
      throw this.handleError(error, 'Failed to list alerts');
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle errors from Firebase Functions
   * 
   * Transforms Firebase Function errors into a consistent ErrorResponse format.
   * 
   * @private
   * @param {any} error - The error from Firebase Functions
   * @param {string} defaultMessage - Default message if error doesn't have one
   * 
   * @returns {ErrorResponse} Formatted error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('AlertsService error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    // Map Firebase error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'functions/unauthenticated': 'Please log in to perform this action',
      'functions/permission-denied': 'You do not have permission to manage alerts',
      'functions/not-found': 'Alert not found',
      'functions/already-exists': 'Alert already exists',
      'functions/invalid-argument': 'Invalid request parameters',
      'functions/failed-precondition': message, // Use original message for business logic errors
      'functions/internal': 'An internal error occurred. Please try again',
      'functions/unavailable': 'Alert service temporarily unavailable. Please try again',
      'functions/deadline-exceeded': 'Request timeout. Please try again',
    };

    const friendlyMessage = errorMessages[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of AlertsService
 * Use this exported instance in your application
 * 
 * @example
 * import { alertsService } from './services/alerts.Service';
 * 
 * // Acknowledge alert
 * await alertsService.acknowledgeAlert('alert_12345');
 * 
 * // Resolve alert with notes
 * await alertsService.resolveAlert('alert_12345', 'Fixed by replacing sensor');
 * 
 * // List filtered alerts
 * const criticalAlerts = await alertsService.listAlerts({
 *   severity: ['Critical'],
 *   status: ['Active']
 * });
 */
export const alertsService = new AlertsService();

/**
 * Default export for convenience
 */
export default alertsService;
