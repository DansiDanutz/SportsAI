import { usePWA } from '../hooks/usePWA';

export function PWAUpdatePrompt() {
  const { needRefresh, offlineReady, updateServiceWorker } = usePWA();

  if (offlineReady) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 bg-green-600 text-white py-3 px-4 rounded-lg shadow-lg max-w-sm animate-slide-up"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">App ready for offline use!</span>
        </div>
      </div>
    );
  }

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white py-3 px-4 rounded-lg shadow-lg max-w-sm"
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">New version available!</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateServiceWorker()}
            className="flex-1 bg-white text-blue-600 px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={() => {}}
            className="px-3 py-1.5 text-sm text-blue-100 hover:text-white transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
