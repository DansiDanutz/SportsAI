import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOffline: Date | null;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOffline, setLastOffline] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Track that we came back online after being offline
    if (!navigator.onLine === false) {
      setWasOffline(true);
      // Reset wasOffline after a short delay to allow for sync notifications
      setTimeout(() => setWasOffline(false), 5000);
    }
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setLastOffline(new Date());
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, lastOffline };
}

export default useOnlineStatus;
