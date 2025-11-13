/**
 * useMutation - Enhanced Mutation Hook
 * 
 * Application-specific wrapper around React Query's useMutation with automatic cache invalidation.
 * This wrapper is NOT deprecated - it provides valuable automatic cache management that simplifies
 * mutation handling across the application.
 * 
 * **Why use this instead of React Query's useMutation directly?**
 * - ✅ Automatic cache invalidation via `invalidateQueries` option (no manual queryClient calls)
 * - ✅ Consistent mutation pattern across all write hooks
 * - ✅ Simplified API - less boilerplate in consuming code
 * - ✅ Centralized mutation logic for easier maintenance
 * 
 * **When to use:**
 * - ALL write operations in custom hooks (useCall_* hooks)
 * - Any mutation that needs to invalidate related queries
 * - Standard CRUD operations with automatic cache refresh
 * 
 * **When to use React Query's useMutation directly:**
 * - Complex optimistic updates requiring full control
 * - Advanced mutation orchestration with manual cache management
 * - One-off mutations outside the standard hook pattern
 * 
 * Powered by @tanstack/react-query for:
 * - Automatic cache invalidation
 * - Optimistic updates
 * - Request deduplication
 * - Built-in retry logic
 * - DevTools integration
 * 
 * @module hooks/writes
 */

import { useMutation as useReactQueryMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation options (compatible with React Query)
 */
export interface MutationOptions<TData = unknown, TError = Error, TVariables = void> {
  /** Function to execute - receives variables and returns a promise */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on failed mutation */
  onError?: (error: TError, variables: TVariables) => void;
  /** Called when mutation settles (success or error) */
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
  /** Query keys to invalidate on success */
  invalidateQueries?: string[][];
  /** Enable optimistic updates */
  onMutate?: (variables: TVariables) => Promise<any> | any;
}

/**
 * Enhanced mutation hook powered by React Query
 * 
 * Wrapper around @tanstack/react-query's useMutation with application-specific
 * enhancements like automatic cache invalidation and optimistic updates.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const mutation = useMutation({
 *   mutationFn: async (userId: string) => {
 *     return await userService.deleteUser(userId);
 *   },
 *   invalidateQueries: [['users', 'realtime']], // Auto-invalidate users list
 *   onSuccess: () => {
 *     message.success('User deleted');
 *   },
 *   onError: (error) => {
 *     message.error(error.message);
 *   }
 * });
 * 
 * // Execute mutation
 * await mutation.mutateAsync('user-123');
 * 
 * // Check state
 * if (mutation.isPending) return <Spin />;
 * if (mutation.isError) return <Error message={mutation.error.message} />;
 * if (mutation.isSuccess) return <Success data={mutation.data} />;
 * ```
 * 
 * @example
 * ```tsx
 * // With complex variables and optimistic updates
 * const addDeviceMutation = useMutation({
 *   mutationFn: async ({ id, data }: { id: string; data: DeviceData }) => {
 *     return await deviceService.addDevice(id, data);
 *   },
 *   onMutate: async (newDevice) => {
 *     // Optimistically update UI before server responds
 *     await queryClient.cancelQueries({ queryKey: ['devices'] });
 *     const previousDevices = queryClient.getQueryData(['devices']);
 *     queryClient.setQueryData(['devices'], (old) => [...old, newDevice]);
 *     return { previousDevices };
 *   },
 *   invalidateQueries: [['devices', 'realtime']],
 * });
 * ```
 * 
 * @template TData - Type of successful mutation result
 * @template TError - Type of error (defaults to Error)
 * @template TVariables - Type of variables passed to mutation (defaults to void)
 * 
 * @param options - Mutation configuration options
 * @returns Mutation state and functions (compatible with React Query)
 */
export function useMutation<TData = unknown, TError = Error, TVariables = void>(
  options: MutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();
  const { invalidateQueries, onSuccess, onError, onSettled, ...reactQueryOptions } = options;

  return useReactQueryMutation<TData, TError, TVariables>({
    ...reactQueryOptions,
    onSuccess: (data, variables) => {
      // Invalidate specified queries to refetch fresh data
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // Call user's onSuccess callback
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      // Call user's onError callback
      onError?.(error, variables);
    },
    onSettled: (data, error, variables) => {
      // Call user's onSettled callback
      onSettled?.(data, error, variables);
    },
  });
}

export default useMutation;
