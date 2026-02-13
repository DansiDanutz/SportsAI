/**
 * Storage utility with quota error handling
 * Provides safe localStorage operations with error recovery and fallback mechanisms
 */

export interface StorageResult {
  success: boolean;
  error?: 'quota_exceeded' | 'storage_unavailable' | 'unknown';
  message?: string;
  usedFallback?: boolean;
}

export interface StorageQuotaInfo {
  used: number;
  total: number;
  percentage: number;
  available: number;
  isNearLimit: boolean; // > 80% used
  isAtLimit: boolean; // > 95% used
}

// Storage keys prioritized by importance (most important first)
// Critical data that should never be cleared
const CRITICAL_KEYS = ['token', 'auth-storage'];

// Non-critical keys that can be cleared if quota is exceeded
const CLEARABLE_KEYS = ['scroll-positions', 'recent-searches', 'ui-preferences'];

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get estimated storage usage with detailed quota information
 */
export function getStorageUsage(): StorageQuotaInfo {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        // Each character is typically 1-2 bytes (UTF-8), we'll estimate 1 byte per char
        used += key.length + value.length;
      }
    }
  } catch {
    // Ignore errors
  }

  // Typical localStorage limit is 5MB (some browsers may have 10MB)
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;
  
  return {
    used,
    total,
    percentage,
    available: total - used,
    isNearLimit: percentage > 80,
    isAtLimit: percentage > 95,
  };
}

/**
 * Check if we should use sessionStorage as fallback
 */
function shouldUseSessionStorageFallback(): boolean {
  const usage = getStorageUsage();
  return usage.isAtLimit || !isStorageAvailable();
}

/**
 * Clear non-critical storage items to free up space
 */
export function clearNonCriticalStorage(): number {
  let clearedBytes = 0;

  CLEARABLE_KEYS.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        clearedBytes += key.length + value.length;
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore errors during cleanup
    }
  });

  // Also clear any keys that look like cache entries
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !CRITICAL_KEYS.includes(key)) {
        // Look for cache-like keys
        if (key.startsWith('cache-') || key.includes('-cache') || key.startsWith('temp-')) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          clearedBytes += key.length + value.length;
          localStorage.removeItem(key);
        }
      } catch {
        // Ignore errors
      }
    });
  } catch {
    // Ignore errors
  }

  return clearedBytes;
}

/**
 * Safely set an item in localStorage with quota error handling
 */
export function safeSetItem(key: string, value: string, _useFallback = false): StorageResult {
  if (!isStorageAvailable()) {
    return {
      success: false,
      error: 'storage_unavailable',
      message: 'Local storage is not available in this browser',
    };
  }

  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    // Check if it's a quota exceeded error
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22)
    ) {
      // Try to clear non-critical storage and retry
      const clearedBytes = clearNonCriticalStorage();
      console.warn(`Storage quota exceeded. Cleared ${clearedBytes} bytes of non-critical data.`);

      try {
        localStorage.setItem(key, value);
        return { success: true };
      } catch (retryError) {
        return {
          success: false,
          error: 'quota_exceeded',
          message:
            'Storage quota exceeded. Please clear some browser data or try using a different browser.',
        };
      }
    }

    return {
      success: false,
      error: 'unknown',
      message: 'Failed to save data to local storage',
    };
  }
}

/**
 * Safely get an item from localStorage with sessionStorage fallback
 */
export function safeGetItem(key: string, checkFallback = true): string | null {
  // Try localStorage first
  if (isStorageAvailable()) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Continue to fallback
    }
  }

  // Try sessionStorage as fallback
  if (checkFallback) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a storage error notification message
 */
export function getStorageErrorMessage(result: StorageResult): string {
  switch (result.error) {
    case 'quota_exceeded':
      return 'Storage is full. Some data may not be saved. Please clear browser data.';
    case 'storage_unavailable':
      return 'Your browser does not support local storage. Some features may not work.';
    default:
      return result.message || 'Failed to save data.';
  }
}

/**
 * Monitor storage quota and trigger cleanup if needed
 * Returns true if cleanup was performed
 */
export function monitorAndCleanupStorage(): boolean {
  const usage = getStorageUsage();
  
  if (usage.isNearLimit) {
    console.warn(`Storage usage is at ${usage.percentage.toFixed(1)}%. Performing cleanup...`);
    const clearedBytes = clearNonCriticalStorage();
    
    if (clearedBytes > 0) {
      console.log(`Cleared ${clearedBytes} bytes of non-critical storage.`);
      return true;
    }
  }
  
  return false;
}

/**
 * Get storage keys sorted by size (largest first)
 * Useful for debugging storage issues
 */
export function getStorageKeysBySize(): Array<{ key: string; size: number }> {
  const keys: Array<{ key: string; size: number }> = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        keys.push({
          key,
          size: key.length + value.length,
        });
      }
    }
  } catch {
    // Ignore errors
  }
  
  return keys.sort((a, b) => b.size - a.size);
}
