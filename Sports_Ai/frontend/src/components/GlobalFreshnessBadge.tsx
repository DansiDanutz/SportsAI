import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { formatRelativeTime, useDataFreshnessStore } from '../store/dataFreshnessStore';

export function GlobalFreshnessBadge() {
  const { isAuthenticated } = useAuthStore();
  const { inFlight, lastSuccessfulAt } = useDataFreshnessStore();
  const lastUpdatedLabel = useMemo(() => formatRelativeTime(lastSuccessfulAt), [lastSuccessfulAt]);

  // On authenticated screens we offset for the mobile top bar.
  const topClass = isAuthenticated ? 'top-16 lg:top-4' : 'top-4';

  const label = useMemo(() => {
    // Public pages (login/register/etc.) before any API calls: be explicit.
    if (!isAuthenticated && !lastSuccessfulAt) {
      return 'Sign in to load live data';
    }
    // Authenticated but no successful fetch yet (first run): reassure.
    if (isAuthenticated && !lastSuccessfulAt) {
      return 'Loading live data…';
    }
    return `Updated ${lastUpdatedLabel}`;
  }, [isAuthenticated, lastSuccessfulAt, lastUpdatedLabel]);

  return (
    <div className={`fixed right-4 ${topClass} z-50`}>
      <div className="bg-gray-800/90 backdrop-blur border border-gray-700 text-gray-200 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <span className="text-xs font-medium">
          {label}
        </span>
        {inFlight > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            refreshing…
          </span>
        )}
      </div>
    </div>
  );
}

export default GlobalFreshnessBadge;

