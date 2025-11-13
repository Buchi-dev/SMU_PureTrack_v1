/**
 * useCall_Alerts - Write Hook
 * 
 * Handles alert write operations (acknowledge, resolve).
 * Wraps alertsService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useMutation } from './useMutation';
import { alertsService } from '../../services/alerts.Service';

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
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await alertsService.acknowledgeAlert(alertId);
    },
    onError: (error) => {
      console.error('[useCall_Alerts] Acknowledge error:', error);
    },
  });

  const resolveMutation = useMutation<void, Error, { alertId: string; notes?: string }>({
    mutationFn: async ({ alertId, notes }) => {
      await alertsService.resolveAlert(alertId, notes);
    },
    onError: (error) => {
      console.error('[useCall_Alerts] Resolve error:', error);
    },
  });

  // Determine combined loading/error/success state
  const isLoading = acknowledgeMutation.isLoading || resolveMutation.isLoading;
  const error = acknowledgeMutation.error || resolveMutation.error;
  const isSuccess = acknowledgeMutation.isSuccess || resolveMutation.isSuccess;

  const reset = () => {
    acknowledgeMutation.reset();
    resolveMutation.reset();
  };

  return {
    acknowledgeAlert: acknowledgeMutation.mutate,
    resolveAlert: (alertId: string, notes?: string) => resolveMutation.mutate({ alertId, notes }),
    isLoading,
    error,
    isSuccess,
    reset,
  };
};

export default useCall_Alerts;
