/**
 * useMutation - Generic Mutation Hook
 * 
 * A reusable hook for handling async operations with consistent
 * loading, error, and success state management.
 * 
 * Inspired by React Query's useMutation pattern, but simplified
 * for this application's needs without external dependencies.
 * 
 * @module hooks/writes
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Mutation state
 */
export interface MutationState<TData = unknown, TError = Error> {
  /** Current data from successful mutation */
  data: TData | null;
  /** Current error from failed mutation */
  error: TError | null;
  /** Whether mutation is currently executing */
  isLoading: boolean;
  /** Whether mutation has completed successfully */
  isSuccess: boolean;
  /** Whether mutation has failed */
  isError: boolean;
  /** Whether mutation is idle (not started) */
  isIdle: boolean;
}

/**
 * Mutation options
 */
export interface MutationOptions<TData = unknown, TError = Error, TVariables = void> {
  /** Function to execute - receives variables and returns a promise */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on failed mutation */
  onError?: (error: TError, variables: TVariables) => void;
  /** Called when mutation settles (success or error) */
  onSettled?: (data: TData | null, error: TError | null, variables: TVariables) => void;
}

/**
 * Mutation result
 */
export interface MutationResult<TData = unknown, TError = Error, TVariables = void> extends MutationState<TData, TError> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData>;
  /** Execute the mutation asynchronously (same as mutate) */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Reset mutation state */
  reset: () => void;
}

/**
 * Generic mutation hook for handling async operations
 * 
 * Provides a consistent API for write operations with built-in
 * loading, error, and success state management.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const mutation = useMutation({
 *   mutationFn: async (userId: string) => {
 *     return await userService.deleteUser(userId);
 *   },
 *   onSuccess: () => {
 *     message.success('User deleted');
 *   },
 *   onError: (error) => {
 *     message.error(error.message);
 *   }
 * });
 * 
 * // Execute mutation
 * await mutation.mutate('user-123');
 * 
 * // Check state
 * if (mutation.isLoading) return <Spin />;
 * if (mutation.isError) return <Error message={mutation.error.message} />;
 * if (mutation.isSuccess) return <Success data={mutation.data} />;
 * ```
 * 
 * @example
 * ```tsx
 * // With complex variables
 * const addDeviceMutation = useMutation({
 *   mutationFn: async ({ id, data }: { id: string; data: DeviceData }) => {
 *     return await deviceService.addDevice(id, data);
 *   }
 * });
 * 
 * await addDeviceMutation.mutate({
 *   id: 'ESP32-001',
 *   data: { name: 'Sensor 1', type: 'ESP32' }
 * });
 * ```
 * 
 * @template TData - Type of successful mutation result
 * @template TError - Type of error (defaults to Error)
 * @template TVariables - Type of variables passed to mutation (defaults to void)
 * 
 * @param options - Mutation configuration options
 * @returns Mutation state and functions
 */
export function useMutation<TData = unknown, TError = Error, TVariables = void>(
  options: MutationOptions<TData, TError, TVariables>
): MutationResult<TData, TError, TVariables> {
  const { mutationFn, onSuccess, onError, onSettled } = options;

  // Use refs for callbacks to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onSettledRef = useRef(onSettled);

  // Update refs when callbacks change
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onSettledRef.current = onSettled;

  const [state, setState] = useState<MutationState<TData, TError>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
  });

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
    });
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setState({
        data: null,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
        isIdle: false,
      });

      try {
        const data = await mutationFn(variables);

        setState({
          data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
          isIdle: false,
        });

        // Call success callback
        onSuccessRef.current?.(data, variables);
        onSettledRef.current?.(data, null, variables);

        return data;
      } catch (err) {
        const error = err as TError;

        setState({
          data: null,
          error,
          isLoading: false,
          isSuccess: false,
          isError: true,
          isIdle: false,
        });

        // Call error callback
        onErrorRef.current?.(error, variables);
        onSettledRef.current?.(null, error, variables);

        throw error; // Re-throw for caller handling
      }
    },
    [mutationFn]
  );

  return {
    ...state,
    mutate,
    mutateAsync: mutate, // Alias for consistency with React Query
    reset,
  };
}

export default useMutation;
