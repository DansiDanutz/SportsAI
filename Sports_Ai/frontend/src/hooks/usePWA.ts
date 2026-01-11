import { useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAStatus {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function usePWA(): PWAStatus {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
    onNeedRefresh() {
      console.log('New content available, please refresh.');
    },
    onOfflineReady() {
      console.log('Content cached for offline use.');
    },
  });

  const handleUpdate = useCallback(async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
  }, [updateServiceWorker, setNeedRefresh]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: handleUpdate,
  };
}

export default usePWA;
