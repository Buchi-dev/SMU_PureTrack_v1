/**
 * Switch Case Routing Utility
 *
 * Provides reusable routing functionality for Firebase Callable Functions.
 * Enables single callable function to handle multiple operations via switch case,
 * optimizing Firebase function quota usage and deployment.
 *
 * @module utils/switchCaseRouting
 *
 * @example
 * // Define handlers
 * const handlers = {
 *   createItem: async (request) => ({ success: true, id: '123' }),
 *   updateItem: async (request) => ({ success: true, id: '123' }),
 *   deleteItem: async (request) => ({ success: true }),
 * };
 *
 * // Create callable function with routing
 * export const itemManager = onCall(async (request) => {
 *   requireAuth(request.auth);
 *   return await routeAction(request, handlers, 'action');
 * });
 */

import { HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

/**
 * Generic handler function type
 *
 * @template TRequest - Request data type
 * @template TResponse - Response data type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionHandler<TRequest = any, TResponse = any> = (
  request: CallableRequest<TRequest>
) => Promise<TResponse>;

/**
 * Map of action names to handler functions
 *
 * @template TRequest - Request data type
 * @template TResponse - Response data type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionHandlers<TRequest = any, TResponse = any> = {
  [action: string]: ActionHandler<TRequest, TResponse>;
};

/**
 * Route a request to the appropriate handler based on an action field
 *
 * This utility provides a clean, reusable way to implement switch-case routing
 * in Firebase Callable Functions. It validates the action exists, routes to
 * the appropriate handler, and provides consistent error messages.
 *
 * @template TRequest - Type of the request data
 * @template TResponse - Type of the response data
 *
 * @param {*} request - Firebase Callable request object
 * @param {*} handlers - Map of action names to handler functions
 * @param {*} actionField - Name of the field in request.data that contains the action (default: 'action')
 *
 * @return Promise resolving to the handler's response
 *
 * @throws {HttpsError} invalid-argument - If action is missing or invalid
 * @throws {HttpsError} - Any error thrown by the handler
 *
 * @example
 * // Basic usage
 * const handlers = {
 *   create: handleCreate,
 *   update: handleUpdate,
 *   delete: handleDelete,
 * };
 *
 * export const myFunction = onCall(async (request) => {
 *   requireAuth(request.auth);
 *   return await routeAction(request, handlers);
 * });
 *
 * @example
 * // With custom action field name
 * export const myFunction = onCall(async (request) => {
 *   return await routeAction(request, handlers, 'operation');
 * });
 *
 * @example
 * // With inline handlers
 * export const myFunction = onCall(async (request) => {
 *   return await routeAction(request, {
 *     getUser: async (req) => {
 *       const user = await db.collection('users').doc(req.data.userId).get();
 *       return { user: user.data() };
 *     },
 *     listUsers: async (req) => {
 *       const snapshot = await db.collection('users').get();
 *       return { users: snapshot.docs.map(doc => doc.data()) };
 *     },
 *   });
 * });
 * @return {Promise<TResponse>} Promise resolving to action response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
async function routeAction<TRequest = any, TResponse = any>(
  request: CallableRequest<TRequest>,
  handlers: ActionHandlers<TRequest, TResponse>,
  actionField = "action"
): Promise<TResponse> {
  // Extract action from request data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const action = (request.data as any)?.[actionField];

  // Validate action is provided
  if (!action) {
    const validActions = Object.keys(handlers).join(", ");
    throw new HttpsError(
      "invalid-argument",
      `${actionField} is required. Valid actions: ${validActions}`
    );
  }

  // Check if handler exists for this action
  const handler = handlers[action];
  if (!handler) {
    const validActions = Object.keys(handlers).join(", ");
    throw new HttpsError(
      "invalid-argument",
      `Invalid ${actionField}: ${action}. Valid actions: ${validActions}`
    );
  }

  // Route to handler and return result
  return await handler(request);
}

/**
 * Create a routed callable function with built-in action routing
 *
 * This is a higher-order function that creates a Firebase Callable Function
 * with automatic action routing. It's a more declarative alternative to
 * calling routeAction directly.
 *
 * @template TRequest - Type of the request data
 * @template TResponse - Type of the response data
 *
 * @param {ActionHandlers<TRequest, TResponse>} handlers - Map of action names to handler functions
 * @param {object} options - Configuration options
 * @param {string} options.actionField - Name of the field containing the action (default: 'action')
 * @param {boolean} options.requireAuth - Whether to require authentication (default: true)
 * @param {boolean} options.requireAdmin - Whether to require admin role (default: false)
 * @param {Function} options.beforeRoute - Optional function to run before routing (e.g., auth checks)
 *
 * @return {Function} Callable function handler
 *
 * @example
 * // Basic usage
 * export const userManagement = createRoutedFunction({
 *   updateStatus: handleUpdateStatus,
 *   updateUser: handleUpdateUser,
 *   listUsers: handleListUsers,
 * });
 *
 * @example
 * // With auth requirements
 * export const adminOperations = createRoutedFunction(
 *   {
 *     deleteUser: handleDeleteUser,
 *     resetPassword: handleResetPassword,
 *   },
 *   {
 *     requireAuth: true,
 *     requireAdmin: true,
 *   }
 * );
 *
 * @example
 * // With custom beforeRoute hook
 * export const staffOperations = createRoutedFunction(
 *   {
 *     viewData: handleViewData,
 *     exportReport: handleExportReport,
 *   },
 *   {
 *     beforeRoute: async (request) => {
 *       // Custom validation logic
 *       if (!request.auth?.token?.role) {
 *         throw new HttpsError('permission-denied', 'Role required');
 *       }
 *     },
 *   }
 * );
 * @return {CallableFunction<TRequest, TResponse>} Configured callable function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
export function createRoutedFunction<TRequest = any, TResponse = any>(
  handlers: ActionHandlers<TRequest, TResponse>,
  options: {
    actionField?: string;
    requireAuth?: boolean;
    requireAdmin?: boolean;
    beforeRoute?: (request: CallableRequest<TRequest>) => Promise<void> | void;
  } = {}
): (request: CallableRequest<TRequest>) => Promise<TResponse> {
  const { actionField = "action", requireAuth = true, requireAdmin = false, beforeRoute } = options;

  return async (request: CallableRequest<TRequest>): Promise<TResponse> => {
    // Check authentication if required
    if (requireAuth && !request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required to access this function");
    }

    // Check admin role if required
    if (requireAdmin) {
      const role = request.auth?.token?.role;
      if (role !== "Admin") {
        throw new HttpsError("permission-denied", "Admin privileges required for this operation");
      }
    }

    // Run custom beforeRoute hook if provided
    if (beforeRoute) {
      await beforeRoute(request);
    }

    // Route to appropriate handler
    return await routeAction(request, handlers, actionField);
  };
}
