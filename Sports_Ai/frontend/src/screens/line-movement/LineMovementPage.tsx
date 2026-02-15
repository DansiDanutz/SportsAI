import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { LineMovementChart } from '../../components/LineMovementChart';
import { useOddsHistory } from '../../hooks/useOddsHistory';
import { eventsApi, type Event } from '../../services/api';

type TimeFilter = '1h' | '6h' | '24h' | '7d';

function TimeFilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function EventLineCard({ event, timeFilter }: { event: Event; timeFilter: TimeFilter }) {
  const [expanded, setExpanded] = useState(false);
  const { data: historyData, isLoading } = useOddsHistory(
    expanded ? event.id : undefined
  );

  const hasOdds = event.odds && event.odds.length > 0;
  const bestOdds = hasOdds ? event.odds!.reduce((best, o) => (o.odds > (best?.odds ?? 0) ? o : best), event.odds![0]) : null;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block w-2 h-2 rounded-full ${
              event.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
            }`} />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {event.sport} • {event.league || 'Unknown League'}
            </span>
          </div>
          <h3 className="text-white font-medium truncate">
            {event.homeTeam} vs {event.awayTeam}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            {event.status === 'live' && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">LIVE</span>
            )}
            {bestOdds && (
              <span className="text-xs text-gray-400">
                Best: <span className="text-emerald-400 font-medium">{bestOdds.odds.toFixed(2)}</span> ({bestOdds.bookmaker})
              </span>
            )}
            <span className="text-xs text-gray-500">
              {event.odds?.length || 0} bookmakers
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50 p-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading line movement data...
              </div>
            </div>
          ) : historyData?.history && historyData.history.length > 0 ? (
            <div className="space-y-4">
              {historyData.history.map((h, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300 font-medium">{h.market || 'Moneyline'}</span>
                    <span className="text-xs text-gray-500">{h.movements?.length || 0} data points</span>
                  </div>
                  <LineMovementChart
                    movements={h.movements}
                    title={h.event || `${event.homeTeam} vs ${event.awayTeam}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-500">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-sm">No line movement data available yet</p>
              <p className="text-xs text-gray-600 mt-1">Data will appear as odds change over time</p>
            </div>
          )}

          {/* Current Odds Comparison */}
          {hasOdds && (
            <div className="mt-4 pt-4 border-t border-gray-700/30">
              <h4 className="text-sm text-gray-400 font-medium mb-3">Current Odds Snapshot</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {event.odds!
                  .sort((a, b) => b.odds - a.odds)
                  .map((o, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-lg text-center ${
                        i === 0
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-gray-700/30 border border-gray-700/20'
                      }`}
                    >
                      <div className={`text-lg font-bold ${i === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {o.odds.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{o.bookmaker || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 truncate">{o.outcomeKey}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LineMovementPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events-for-line-movement'],
    queryFn: () => eventsApi.getAll({ limit: 100 }),
    staleTime: 60000,
  });

  const { data: sportsData } = useQuery({
    queryKey: ['sports-summary'],
    queryFn: () => eventsApi.getSportsSummary(),
    staleTime: 300000,
  });

  const events = eventsData?.events || [];
  const filteredEvents = events
    .filter(e => sportFilter === 'all' || e.sport === sportFilter)
    .filter(e => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.homeTeam?.toLowerCase().includes(q) ||
        e.awayTeam?.toLowerCase().includes(q) ||
        e.league?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Live first, then by number of odds
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      return (b.odds?.length || 0) - (a.odds?.length || 0);
    });

  const liveCount = filteredEvents.filter(e => e.status === 'live').length;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Line Movement</h1>
                <p className="text-gray-400 text-sm mt-0.5">Track odds movement across all major sportsbooks in real-time</p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="text-gray-400">
                <span className="text-white font-medium">{filteredEvents.length}</span> events
              </span>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {liveCount} live
                </span>
              )}
              <span className="text-gray-500">•</span>
              <span className="text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                ⭐ Premium
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search teams, leagues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-sm"
              />
            </div>

            {/* Sport filter */}
            <select
              value={sportFilter}
              onChange={e => setSportFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="all">All Sports</option>
              {sportsData?.map(s => (
                <option key={s.key} value={s.key}>{s.name} ({s.events})</option>
              ))}
            </select>

            {/* Time filter */}
            <div className="flex items-center gap-1.5">
              {([
                ['1h', '1H'],
                ['6h', '6H'],
                ['24h', '24H'],
                ['7d', '7D'],
              ] as const).map(([value, label]) => (
                <TimeFilterButton
                  key={value}
                  label={label}
                  active={timeFilter === value}
                  onClick={() => setTimeFilter(value)}
                />
              ))}
            </div>
          </div>

          {/* Events list */}
          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                  <div className="h-5 bg-gray-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <h3 className="text-white font-medium text-lg mb-1">No events found</h3>
              <p className="text-gray-400 text-sm">
                {searchQuery ? 'Try a different search term' : 'No events available right now. Check back later!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map(event => (
                <EventLineCard key={event.id} event={event} timeFilter={timeFilter} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
