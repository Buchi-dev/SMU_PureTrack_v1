/**
 * useCall_Alerts - Write Hook
 * 
 * Handles alert write operations (acknowledge, resolve).
 * Wraps alertsService functions with React-friendly state management.
 * Automatically invalidates SWR cache after successful operations.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { alertsService } from '../../services/alerts.Service';

/**
 * Alert operation types
 */
type AlertOperation = 'acknowledge' | 'resolve';

/**
 * Hook return value
 */
interface UseCallAlertsReturn {
  /** Acknowledge an alert */
  acknowledgeAlert: (alertId: string) => Promise<void>;
  /** Resolve an alert with optional notes */
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Currently executing operation type */
  operationType: AlertOperation | null;
  /** Reset error and success states */
  reset: () => void;
}

/**
 * Hook for alert write operations
 * 
 * Provides functions to acknowledge and resolve alerts with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { acknowledgeAlert, resolveAlert, isLoading, error, isSuccess } = useCall_Alerts();
 * 
 * // Acknowledge alert
 * await acknowledgeAlert('alert-123');
 * 
 * // Resolve alert with notes
 * await resolveAlert('alert-123', 'Issue fixed - valve replaced');
 * 
 * if (isSuccess) {
 *   message.success('Alert updated successfully');
 * }
 * ```
 * 
 * @returns Alert operation functions and state
 */
export const useCall_Alerts = (): UseCallAlertsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [operationType, setOperationType] = useState<AlertOperation | null>(null);
  
  // Get SWR mutate function for cache invalidation
  const { mutate } = useSWRConfig();

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setOperationType(null);
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('acknowledge');

      await alertsService.acknowledgeAlert(alertId);

      // Invalidate alerts cache to trigger refetch
      mutate((key: string) => typeof key === 'string' && key.includes('/alerts'));

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to acknowledge alert');
      console.error('[useCall_Alerts] Acknowledge error:', error);
      setError(error);
      setIsSuccess(false);
      throw error; // Re-throw for caller handling
    } finally {
      setIsLoading(false);
    }
  }, [mutate]);

  const resolveAlert = useCallback(async (alertId: string, notes?: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('resolve');

      await alertsService.resolveAlert(alertId, notes);

      // Invalidate alerts cache to trigger refetch
      mutate((key: string) => typeof key === 'string' && key.includes('/alerts'));

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resolve alert');
      console.error('[useCall_Alerts] Resolve error:', error);
      setError(error);
      setIsSuccess(false);
      throw error; // Re-throw for caller handling
    } finally {
      setIsLoading(false);
    }
  }, [mutate]);

  return {
    acknowledgeAlert,
    resolveAlert,
    isLoading,
    error,
    isSuccess,
    operationType,
    reset,
  };
};

export default useCall_Alerts;
