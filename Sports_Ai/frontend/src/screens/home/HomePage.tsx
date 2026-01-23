import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { PullToRefresh } from '../../components/PullToRefresh';
import { useAuthStore } from '../../store/authStore';
import { eventsApi, api, getErrorMessage } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

interface IntelligenceItem {
  id: string;
  type: 'tip' | 'arbitrage' | 'alert' | 'news';
  priority: number;
  title: string;
  summary: string;
  logic: string;
  confidence: number;
  timestamp: string;
  isStale?: boolean;
  data: any;
}

export function HomePage() {
  const { user } = useAuthStore();

  // 1. Intelligence Feed (The Brain)
  const feedQuery = useQuery<IntelligenceItem[]>({
    queryKey: ['intelligence-feed'],
    queryFn: async () => {
      const response = await api.get('/v1/ai/feed');
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 mins
  });

  // 2. Live Events (The Action)
  const liveQuery = useQuery({
    queryKey: ['live-events'],
    queryFn: () => eventsApi.getLive({ limit: 5 }),
    staleTime: 1000 * 30,
  });

  // 3. Sharp Money (The Smart Money)
  const sharpQuery = useQuery({
    queryKey: ['sharp-money-summary'],
    queryFn: () => api.get('/v1/ai/sharp-money/summary'),
    staleTime: 1000 * 60,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      feedQuery.refetch(),
      liveQuery.refetch(),
      sharpQuery.refetch()
    ]);
  }, [feedQuery, liveQuery, sharpQuery]);

  const feed = feedQuery.data || [];
  const heroItem = feed[0];
  const remainingFeed = feed.slice(1);
  const liveEvents = liveQuery.data?.events || [];

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-green-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">Intelligence Live</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight">
                Command Center
              </h1>
              <p className="text-gray-400 mt-1 font-medium">
                Real-time sports modeling & arbitrage detection.
              </p>
            </div>
            
            <div className="flex items-center gap-6 bg-gray-800/50 border border-gray-700/50 px-6 py-3 rounded-2xl">
              <StatItem label="Active Arbs" value={feed.filter(i => i.type === 'arbitrage').length.toString()} />
              <div className="w-px h-8 bg-gray-700" />
              <StatItem label="High Conf Tips" value={feed.filter(i => i.type === 'tip' && i.confidence >= 85).length.toString()} />
              <div className="w-px h-8 bg-gray-700" />
              <StatItem label="Credits" value={user?.creditBalance?.toString() || '0'} color="text-yellow-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Main Intelligence Column */}
            <div className="xl:col-span-8 space-y-8">
              
              {/* Hero Intelligence */}
              {heroItem ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-gray-800 border border-white/10 rounded-3xl p-8 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <IntelligenceIcon type={heroItem.type} size="w-32 h-32" />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <TypeBadge type={heroItem.type} />
                      <span className={`text-xs font-mono ${heroItem.isStale ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {heroItem.isStale ? 'STALE DATA' : `DETECTED ${formatDistanceToNow(new Date(heroItem.timestamp), { addSuffix: true }).toUpperCase()}`}
                      </span>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                      {heroItem.title}
                    </h2>
                    <p className="text-xl text-gray-300 mb-6 max-w-2xl leading-relaxed">
                      {heroItem.summary}
                    </p>

                    <div className="bg-white/5 border-l-4 border-l-green-500 p-4 mb-8 rounded-r-xl">
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest block mb-1">Execution Logic</span>
                      <p className="text-sm text-gray-400 italic">"{heroItem.logic}"</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Link 
                        to={heroItem.type === 'arbitrage' ? `/arbitrage/${heroItem.data.arbId}` : `/event/${heroItem.data.eventId}`}
                        className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-green-400 transition-all text-center tracking-tight"
                      >
                        EXECUTE STRATEGY
                      </Link>
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confidence</div>
                        <div className="text-2xl font-black text-green-400">{heroItem.confidence}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : feedQuery.isLoading ? (
                <div className="h-64 bg-gray-800/50 rounded-3xl animate-pulse flex items-center justify-center border border-dashed border-gray-700">
                  <span className="text-gray-500 font-mono tracking-widest">ANALYZING MARKET DATA...</span>
                </div>
              ) : (
                <div className="bg-gray-800/50 rounded-3xl p-12 text-center border border-dashed border-gray-700">
                  <div className="text-4xl mb-4">🌑</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Active Intelligence</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    The intelligence engine is currently scanning for opportunities. Check back shortly or adjust your AI filters.
                  </p>
                </div>
              )}

              {/* Secondary Feed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {remainingFeed.map((item) => (
                  <IntelligenceCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="xl:col-span-4 space-y-8">
              
              {/* Live Action Sidebar */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live Action
                  </h3>
                  <Link to="/sports" className="text-xs font-bold text-green-500 hover:underline">VIEW ALL</Link>
                </div>

                {liveEvents.length > 0 ? (
                  <div className="space-y-4">
                    {liveEvents.map((event) => (
                      <LiveMiniCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-gray-900/50 rounded-2xl border border-gray-800">
                    <p className="text-xs text-gray-500 font-mono italic">NO LIVE EVENTS TRACKED</p>
                  </div>
                )}
              </div>

              {/* Smart Money Flows */}
              <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl p-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2 text-purple-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.184a4.535 4.535 0 00-1.676.662C6.602 13.234 6 14.009 6 15c0 .99.602 1.765 1.324 2.246A4.535 4.535 0 009 17.908V18a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 16.766 14 15.991 14 15c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 12.092v-1.184a4.535 4.535 0 001.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V5z" clipRule="evenodd"/></svg>
                  Sharp Money Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Steam Moves</div>
                    <div className="text-2xl font-black text-white">{sharpQuery.data?.summary?.steamMoves || 0}</div>
                  </div>
                  <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">RLM</div>
                    <div className="text-2xl font-black text-white">{sharpQuery.data?.summary?.reverseLineMovements || 0}</div>
                  </div>
                </div>
                
                <button className="w-full mt-6 py-3 bg-purple-500/10 text-purple-400 font-bold rounded-xl border border-purple-500/20 hover:bg-purple-500/20 transition-all text-xs tracking-widest">
                  ANALYZE FLOWS
                </button>
              </div>

              {/* Favorites Quick Access */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Your Favorites</h3>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-500 italic font-medium">Monitoring matches for your favorited teams...</p>
                  <Link to="/favorites" className="inline-flex items-center gap-2 text-xs font-bold text-green-500 hover:text-green-400">
                    Manage Favorites
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}

function StatItem({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-xl font-black ${color}`}>{value}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: IntelligenceItem['type'] }) {
  const styles = {
    tip: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    arbitrage: 'bg-green-500/20 text-green-400 border-green-500/30',
    alert: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    news: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[type]}`}>
      {type === 'alert' ? 'CRITICAL SIGNAL' : type}
    </span>
  );
}

function IntelligenceIcon({ type, size = "w-6 h-6" }: { type: IntelligenceItem['type'], size?: string }) {
  if (type === 'arbitrage') return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
  if (type === 'tip') return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>;
  if (type === 'alert') return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
  return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>;
}

function IntelligenceCard({ item }: { item: IntelligenceItem }) {
  return (
    <div className="bg-gray-800/50 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <TypeBadge type={item.type} />
        <div className="text-[10px] font-mono text-gray-500">CONFIDENCE: {item.confidence}%</div>
      </div>
      
      <h4 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
        {item.title}
      </h4>
      <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed font-medium">
        {item.summary}
      </p>

      {item.logic && (
        <div className="mb-4 text-[11px] text-gray-500 bg-gray-900/50 p-2 rounded-lg border border-white/5 italic">
          {item.logic}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <span className={`text-[10px] font-mono uppercase ${item.isStale ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
          {item.isStale ? 'STALE' : formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </span>
        <Link 
          to={item.type === 'arbitrage' ? `/arbitrage/${item.data.arbId}` : `/event/${item.data.eventId}`}
          className="text-xs font-bold text-white hover:text-green-400 flex items-center gap-1"
        >
          VIEW LOGIC
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </div>
  );
}

function LiveMiniCard({ event }: { event: any }) {
  return (
    <Link 
      to={`/event/${event.id}`}
      className="block p-4 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-red-500/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{event.league}</span>
        <span className="flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
      </div>
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="text-xs font-black text-white uppercase group-hover:text-red-400 transition-colors">{event.homeTeam}</div>
          <div className="text-xs font-black text-white uppercase group-hover:text-red-400 transition-colors">{event.awayTeam}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-gray-500 tracking-tighter">LIVE</div>
          <div className="text-[10px] font-bold text-green-500 uppercase mt-1">Odds Available</div>
        </div>
      </div>
    </Link>
  );
}
