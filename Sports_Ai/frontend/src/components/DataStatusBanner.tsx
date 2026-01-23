import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export function DataStatusBanner() {
  const { data: healthData } = useQuery({
    queryKey: ['health-data'],
    queryFn: async () => {
      const response = await api.get('/health/data');
      return response.data;
    },
    refetchInterval: 60000, // Check every minute
  });

  const hasQuotaIssue = healthData?.data?.oddsQuotes24h === 0 && healthData?.data?.upcomingEvents > 0;
  
  // Also check for specific sync error messages that might indicate quota
  const syncError = healthData?.oddsSync?.lastSyncError || '';
  const isQuotaError = syncError.toLowerCase().includes('quota') || 
                       syncError.toLowerCase().includes('credit') || 
                       syncError.toLowerCase().includes('limit');

  if (!hasQuotaIssue && !isQuotaError) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-500">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider">Live Data Warning</span>
          <p className="text-sm text-amber-200/80">
            {isQuotaError 
              ? 'API Quota reached. Live odds updates are temporarily suspended.'
              : 'Our intelligence engine detected 0 new odds quotes in the last 24h. Data may be stale.'}
          </p>
        </div>
        <Link 
          to="/admin" 
          className="text-xs font-bold text-amber-500 hover:text-amber-400 underline decoration-2 underline-offset-4 whitespace-nowrap"
        >
          Check API Status
        </Link>
      </div>
    </div>
  );
}
