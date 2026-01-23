import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export function DataStatusBanner() {
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const isAdmin = user?.role === 'admin';

  const { data: healthData, refetch } = useQuery({
    queryKey: ['health-data'],
    queryFn: async () => {
      const response = await api.get('/health/data');
      return response.data;
    },
    refetchInterval: 60000, // Check every minute
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/v1/admin/sync'),
    onSuccess: () => {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        refetch();
      }, 5000);
    },
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
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="p-1.5 bg-amber-500/20 rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] block leading-none mb-1">Live Data Engine Warning</span>
            <p className="text-sm text-amber-200/90 font-medium">
              {isQuotaError 
                ? 'API Quota limit reached on production keys. Live intelligence is paused.'
                : 'Intelligence engine reports 0 new market movements in 24h. Signals may be stale.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isSyncing}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
                isSyncing 
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 animate-pulse' 
                  : 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 active:scale-95'
              }`}
            >
              {isSyncing ? 'SYNCING...' : 'FORCE ENGINE SYNC'}
            </button>
          )}
          <Link 
            to="/admin" 
            className="text-[10px] font-black text-amber-500/80 hover:text-amber-400 uppercase tracking-widest border-b border-amber-500/30 hover:border-amber-400 transition-colors"
          >
            System Status
          </Link>
        </div>
      </div>
    </div>
  );
}
