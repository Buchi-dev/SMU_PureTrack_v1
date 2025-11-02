/**
 * Firestore Offline Persistence Configuration
 * 
 * Enables offline data persistence for better user experience
 * Handles multi-tab scenarios and browser compatibility
 * 
 * @module config/firestoreOffline
 */

import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Persistence configuration options
 */
export interface PersistenceOptions {
  multiTab?: boolean;
  synchronizeTabs?: boolean;
  forceOwnership?: boolean;
}

/**
 * Enable Firestore offline persistence
 * 
 * Attempts to enable offline persistence with fallback handling
 * Supports both single-tab and multi-tab persistence modes
 * 
 * @param db - Firestore instance
 * @param options - Persistence configuration
 * @returns Promise resolving to success status
 * 
 * @example
 * ```typescript
 * import { db } from './config/firebase';
 * import { enableOfflinePersistence } from './config/firestoreOffline';
 * 
 * // In app initialization
 * await enableOfflinePersistence(db, { multiTab: true });
 * ```
 */
export async function enableOfflinePersistence(
  db: Firestore,
  options: PersistenceOptions = {}
): Promise<boolean> {
  const { multiTab = true, synchronizeTabs = true, forceOwnership = false } = options;

  try {
    if (multiTab && synchronizeTabs) {
      // Multi-tab persistence (recommended for most apps)
      await enableMultiTabIndexedDbPersistence(db);
      console.log('✓ Multi-tab offline persistence enabled');
      console.log('  → Data syncs across browser tabs');
      console.log('  → Changes persist even when offline');
      return true;
    } else {
      // Single-tab persistence
      await enableIndexedDbPersistence(db, { forceOwnership });
      console.log('✓ Single-tab offline persistence enabled');
      console.log('  → Data persists when offline');
      console.log('  → Only one tab can have persistence active');
      return true;
    }
  } catch (error: any) {
    console.warn('⚠ Firestore offline persistence error:', error.code);

    // Handle specific error cases
    if (error.code === 'failed-precondition') {
      // Multiple tabs open - only first tab gets persistence
      console.warn('  → Multiple tabs detected');
      console.warn('  → Persistence enabled in first tab only');
      console.warn('  → Consider enabling multi-tab persistence');
      return false;
    } else if (error.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn('  → Browser does not support offline persistence');
      console.warn('  → App will work in online-only mode');
      return false;
    } else {
      // Unknown error
      console.error('  → Unexpected error:', error.message);
      return false;
    }
  }
}

/**
 * Check if offline persistence is supported in current browser
 * 
 * @returns Boolean indicating IndexedDB support
 */
export function isPersistenceSupported(): boolean {
  try {
    return (
      typeof indexedDB !== 'undefined' &&
      indexedDB !== null &&
      typeof indexedDB.open === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Get persistence status information
 * 
 * @returns Object with persistence capabilities
 */
export function getPersistenceInfo(): {
  supported: boolean;
  indexedDBAvailable: boolean;
  storageEstimate?: StorageEstimate;
} {
  const supported = isPersistenceSupported();
  const indexedDBAvailable = typeof indexedDB !== 'undefined';

  return {
    supported,
    indexedDBAvailable,
  };
}

/**
 * Estimate available storage for persistence
 * 
 * @returns Promise resolving to storage estimate
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      return await navigator.storage.estimate();
    } catch (error) {
      console.warn('Unable to estimate storage:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear Firestore offline cache
 * 
 * Useful for troubleshooting or forced refresh scenarios
 * Note: This requires clearing IndexedDB data
 * 
 * @returns Promise resolving to success status
 */
export async function clearOfflineCache(): Promise<boolean> {
  if (!isPersistenceSupported()) {
    console.warn('Offline persistence not supported');
    return false;
  }

  try {
    // Clear Firebase-specific IndexedDB databases
    const databases = await indexedDB.databases();
    const firebaseDbs = databases.filter(
      (db) => db.name?.startsWith('firestore/') || db.name?.includes('firebase')
    );

    for (const db of firebaseDbs) {
      if (db.name) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log(`Cleared cache: ${db.name}`);
      }
    }

    console.log('✓ Offline cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing offline cache:', error);
    return false;
  }
}

/**
 * Initialize offline persistence with comprehensive error handling
 * 
 * This is a convenience function that combines persistence setup
 * with diagnostics and fallback handling
 * 
 * @param db - Firestore instance
 * @param options - Persistence configuration
 * @returns Promise resolving to persistence status object
 * 
 * @example
 * ```typescript
 * const status = await initializeOfflinePersistence(db, {
 *   multiTab: true,
 *   synchronizeTabs: true,
 * });
 * 
 * if (status.enabled) {
 *   console.log('Offline mode available');
 * } else {
 *   console.log('Online-only mode');
 * }
 * ```
 */
export async function initializeOfflinePersistence(
  db: Firestore,
  options: PersistenceOptions = {}
): Promise<{
  enabled: boolean;
  multiTab: boolean;
  supported: boolean;
  error?: string;
}> {
  console.log('🔧 Initializing Firestore offline persistence...');

  // Check browser support
  const supported = isPersistenceSupported();
  if (!supported) {
    console.warn('⚠ IndexedDB not supported - running in online-only mode');
    return {
      enabled: false,
      multiTab: false,
      supported: false,
      error: 'IndexedDB not supported',
    };
  }

  // Get storage estimate
  const storageEstimate = await getStorageEstimate();
  if (storageEstimate) {
    const { usage = 0, quota = 0 } = storageEstimate;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
    console.log(
      `  Storage: ${(usage / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB (${usagePercent.toFixed(1)}% used)`
    );
  }

  // Enable persistence
  const enabled = await enableOfflinePersistence(db, options);

  return {
    enabled,
    multiTab: options.multiTab ?? true,
    supported: true,
  };
}

export default {
  enableOfflinePersistence,
  isPersistenceSupported,
  getPersistenceInfo,
  getStorageEstimate,
  clearOfflineCache,
  initializeOfflinePersistence,
};
