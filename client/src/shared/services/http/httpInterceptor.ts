/**
 * HTTP Interceptor
 * Request and response interceptors for Axios
 */

import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { parseHttpError, logError, getErrorMessage } from './httpError';

/**
 * Setup request interceptor
 * Adds common headers, authentication tokens, etc.
 */
export const setupRequestInterceptor = (axiosInstance: AxiosInstance): void => {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add timestamp to request (extend config with metadata)
      (config as InternalAxiosRequestConfig & { metadata?: { startTime: number } }).metadata = {
        startTime: Date.now(),
      };

      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error) => {
      const apiError = parseHttpError(error);
      logError(apiError, 'Request Interceptor');
      return Promise.reject(error);
    }
  );
};

/**
 * Setup response interceptor
 * Handles common response transformations and errors
 */
export const setupResponseInterceptor = (axiosInstance: AxiosInstance): void => {
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Calculate request duration
      const config = response.config as InternalAxiosRequestConfig & {
        metadata?: { startTime: number };
      };
      const duration = config.metadata?.startTime
        ? Date.now() - config.metadata.startTime
        : 0;

      // Log response in development
      if (import.meta.env.DEV) {
        console.log(
          `[HTTP Response] ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`,
          {
            status: response.status,
            data: response.data,
          }
        );
      }

      return response;
    },
    (error) => {
      const apiError = parseHttpError(error);
      const userMessage = getErrorMessage(apiError);

      // Log error
      logError(apiError, 'Response Interceptor');

      // Log user-friendly message in development
      if (import.meta.env.DEV) {
        console.error(`[HTTP Error] ${userMessage}`);
      }

      // Attach user-friendly message to error
      error.userMessage = userMessage;

      return Promise.reject(error);
    }
  );
};

/**
 * Setup both request and response interceptors
 */
export const setupInterceptors = (axiosInstance: AxiosInstance): void => {
  setupRequestInterceptor(axiosInstance);
  setupResponseInterceptor(axiosInstance);
};
