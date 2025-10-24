/**
 * Core Module - Barrel Export
 * Central export point for core application resources
 */

// Providers
export * from './providers';

// Router
export * from './router/routes';

// Config
export { auth, db } from './config/firebase.config';
