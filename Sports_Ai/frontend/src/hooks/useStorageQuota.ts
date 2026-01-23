import { useEffect, useState, useCallback } from 'react';
import { getStorageUsage, monitorAndCleanupStorage, StorageQuotaInfo } from '../utils/storage';

/**
 * Hook to monitor storage quota and provide cleanup functionality
 * 
 * @param checkInterval - How often to check storage usage (in ms). Default: 60000 (1 minute)
 * @param autoCleanupThreshold - Auto-cleanup when usage exceeds this percentage. Default: 85
 * @returns Storage quota information and cleanup function
 */
export function useStorageQuota(
  checkInterval: number = 60000,
  autoCleanupThreshold: number = 85
) {
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo>(() => getStorageUsage());
  const [lastCleanup, setLastCleanup] = useState<number | null>(null);

  const checkQuota = useCallback(() => {
    const usage = getStorageUsage();
    setQuotaInfo(usage);

    // Auto-cleanup if threshold exceeded
    if (usage.percentage > autoCleanupThreshold) {
      const cleaned = monitorAndCleanupStorage();
      if (cleaned) {
        setLastCleanup(Date.now());
        // Re-check after cleanup
        setQuotaInfo(getStorageUsage());
      }
    }
  }, [autoCleanupThreshold]);

  const performCleanup = useCallback(() => {
    const cleaned = monitorAndCleanupStorage();
    if (cleaned) {
      setLastCleanup(Date.now());
      checkQuota();
      return true;
    }
    return false;
  }, [checkQuota]);

  useEffect(() => {
    // Initial check
    checkQuota();

    // Set up periodic checking
    const interval = setInterval(checkQuota, checkInterval);

    // Also check on storage events (when other tabs modify storage)
    const handleStorageChange = () => {
      checkQuota();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkInterval, checkQuota]);

  return {
    quotaInfo,
    lastCleanup,
    performCleanup,
    checkQuota,
    isNearLimit: quotaInfo.isNearLimit,
    isAtLimit: quotaInfo.isAtLimit,
  };
}
