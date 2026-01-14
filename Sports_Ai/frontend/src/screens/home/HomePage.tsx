import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { PullToRefresh } from '../../components/PullToRefresh';
import { useAuthStore } from '../../store/authStore';
import { eventsApi, Event, api, AiAdvice, AiNewsItem, SharpMoneyAlert } from '../../services/api';
import { useArbitrage } from '../../hooks/useArbitrage';

// ... (keep interface definitions)

export function HomePage() {
  const { user } = useAuthStore();
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Fetch Arbitrage Data
  const { data: arbitrageData } = useArbitrage();

  // Fetch AI Advice ...

  // Fetch AI Advice
  const { data: adviceData } = useQuery({
    queryKey: ['ai-advice'],
    queryFn: async () => {
      const response = await api.get<{ advice: AiAdvice[]; configuration: any; matchCount: number }>('/v1/ai/advice');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });

  // Fetch AI News
  const { data: newsData } = useQuery({
    queryKey: ['ai-news'],
    queryFn: async () => {
      const response = await api.get<{ news: AiNewsItem[]; sportScope: string[]; refreshedAt: string }>('/v1/ai/news');
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: 1,
  });

  // Fetch Sharp Money Alerts
  const { data: sharpMoneyData } = useQuery({
    queryKey: ['sharp-money'],
    queryFn: async () => {
      const response = await api.get<{ alerts: SharpMoneyAlert[]; total: number }>('/v1/ai/sharp-money');
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes (more frequent updates for sharp money)
    retry: 1,
  });

  const favoritesCountQuery = useQuery({
    queryKey: ['favoritesCount'],
    queryFn: async () => {
      const response = await api.get('/v1/favorites');
      return response.data.total || 0;
    },
    staleTime: 1000 * 30,
    retry: 1,
    placeholderData: (prev) => prev ?? 0,
  });

  const eventsQuery = useQuery({
    queryKey: ['homeEvents', favoritesOnly],
    queryFn: async () => {
      const [upcomingRes, liveRes] = await Promise.all([
        eventsApi.getUpcoming({ favoritesOnly, limit: 10 }),
        eventsApi.getLive({ favoritesOnly, limit: 5 }),
      ]);
      return {
        upcoming: upcomingRes.events,
        live: liveRes.events,
      };
    },
    staleTime: 1000 * 30,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([eventsQuery.refetch(), favoritesCountQuery.refetch()]);
  }, [eventsQuery, favoritesCountQuery]);

  const favoritesCount = favoritesCountQuery.data ?? 0;
  const upcomingEvents = eventsQuery.data?.upcoming ?? [];
  const liveEvents = eventsQuery.data?.live ?? [];
  const loading = eventsQuery.isLoading || eventsQuery.isFetching;
  const error = eventsQuery.error;

  const lastUpdatedLabel = useMemo(() => {
    const updatedAt = eventsQuery.dataUpdatedAt;
    if (!updatedAt) return null;
    const diffMs = Date.now() - updatedAt;
    const mins = Math.floor(diffMs / 60000);
    if (mins <= 0) return 'just now';
    if (mins === 1) return '1 minute ago';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  }, [eventsQuery.dataUpdatedAt]);

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-gray-400 mt-2">
              Your personalized sports intelligence feed
            </p>
            {lastUpdatedLabel && (
              <p className="text-gray-500 text-sm mt-2">
                Updated {lastUpdatedLabel}
              </p>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                favoritesOnly
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill={favoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Favorites Only
            </button>
            <span className="text-gray-500 flex items-center text-sm">
              {favoritesOnly ? 'Showing events with your favorite teams' : 'Showing all events'}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Active Arbitrage"
              value={arbitrageData?.count?.toString() || '0'}
              change={arbitrageData?.summary?.bestROI ? `+${arbitrageData.summary.bestROI.toFixed(1)}%` : ''}
              changeType="positive"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatCard
              title="Your Favorites"
              value={favoritesCount.toString()}
              change=""
              changeType="neutral"
              testId="favorites-count"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
            />
            <StatCard
              title="Upcoming Events"
              value={upcomingEvents.length.toString()}
              change={favoritesOnly ? 'Filtered' : ''}
              changeType="neutral"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Your Credits"
              value={user?.creditBalance?.toString() || '0'}
              change=""
              changeType="neutral"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Live Events"
              value={liveEvents.length.toString()}
              change=""
              changeType="neutral"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
            />
          </div>

          {/* AI News & Advice Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* AI News */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📰</span>
                  <h2 className="text-xl font-semibold text-white">AI News</h2>
                </div>
                <span className="text-xs text-gray-500">Updated {newsData?.refreshedAt ? new Date(newsData.refreshedAt).toLocaleTimeString() : 'recently'}</span>
              </div>

              {newsData?.news && newsData.news.length > 0 ? (
                <div className="space-y-3">
                  {newsData.news.slice(0, 3).map((news) => (
                    <div key={news.id} className="p-3 bg-gray-700/40 rounded-lg border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              news.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                              news.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {news.impact.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">{news.sport}</span>
                          </div>
                          <h4 className="text-white font-medium text-sm leading-tight">{news.headline}</h4>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{news.summary}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Loading news...</p>
                </div>
              )}
            </div>

            {/* AI Advice */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <h2 className="text-xl font-semibold text-white">AI Advice</h2>
                </div>
                {adviceData?.configuration && (
                  <Link to="/setup" className="text-xs text-green-500 hover:text-green-400">
                    {adviceData.configuration.name}
                  </Link>
                )}
              </div>

              {adviceData?.advice && adviceData.advice.length > 0 ? (
                <div className="space-y-3">
                  {adviceData.advice.slice(0, 3).map((advice) => (
                    <div key={advice.id} className={`p-3 bg-gray-700/40 rounded-lg border-l-4 ${
                      advice.category === 'opportunity' ? 'border-l-green-500' :
                      advice.category === 'warning' ? 'border-l-red-500' :
                      advice.category === 'strategy' ? 'border-l-purple-500' :
                      'border-l-blue-500'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">
                              {advice.category === 'opportunity' ? '💎' :
                               advice.category === 'warning' ? '⚠️' :
                               advice.category === 'strategy' ? '🎯' : '💡'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              advice.category === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                              advice.category === 'warning' ? 'bg-red-500/20 text-red-400' :
                              advice.category === 'strategy' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {advice.category.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">{advice.confidence}% confidence</span>
                          </div>
                          <h4 className="text-white font-medium text-sm leading-tight">{advice.title}</h4>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{advice.content}</p>
                          {advice.relatedMatch && (
                            <p className="text-green-400 text-xs mt-1">📍 {advice.relatedMatch}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Loading advice...</p>
                  <Link to="/setup" className="text-green-500 hover:text-green-400 text-xs mt-2 inline-block">
                    Configure your AI preferences
                  </Link>
                </div>
              )}

              {!adviceData?.configuration && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-xs">
                    <Link to="/setup" className="font-medium hover:underline">Set up your AI configuration</Link> to get personalized betting advice based on your preferences.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sharp Money Alerts Section */}
          {sharpMoneyData?.alerts && sharpMoneyData.alerts.length > 0 && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl border border-orange-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Sharp Money Alerts</h2>
                      <p className="text-xs text-orange-300">Unusual betting activity detected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-orange-400">{sharpMoneyData.total} Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharpMoneyData.alerts.slice(0, 3).map((alert) => (
                    <Link
                      key={alert.id}
                      to={`/event/${alert.eventId}`}
                      className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                        alert.severity === 'high' ? 'bg-red-900/30 border-red-500/50' :
                        alert.severity === 'medium' ? 'bg-orange-900/30 border-orange-500/50' :
                        'bg-yellow-900/30 border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          alert.alertType === 'steam_move' ? 'bg-red-500/20 text-red-400' :
                          alert.alertType === 'reverse_line_movement' ? 'bg-purple-500/20 text-purple-400' :
                          alert.alertType === 'sharp_action' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {alert.alertType === 'steam_move' ? '🔥 STEAM' :
                           alert.alertType === 'reverse_line_movement' ? '↩️ RLM' :
                           alert.alertType === 'sharp_action' ? '💰 SHARP' : '📊 VOLUME'}
                        </span>
                        <span className={`text-xs font-medium ${
                          alert.severity === 'high' ? 'text-red-400' :
                          alert.severity === 'medium' ? 'text-orange-400' :
                          'text-yellow-400'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="mb-2">
                        <h4 className="text-white font-medium text-sm">
                          {alert.homeTeam} vs {alert.awayTeam}
                        </h4>
                        <p className="text-gray-400 text-xs">{alert.league}</p>
                      </div>
                      <p className="text-gray-300 text-xs mb-2 line-clamp-2">{alert.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {alert.details.previousOdds.toFixed(2)} → {alert.details.currentOdds.toFixed(2)}
                        </span>
                        <span className={alert.details.oddsChange < 0 ? 'text-green-400' : 'text-red-400'}>
                          {alert.details.oddsChange > 0 ? '+' : ''}{alert.details.percentageChange.toFixed(1)}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {sharpMoneyData.alerts.length > 3 && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/daily-ai"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      View All {sharpMoneyData.total} Alerts
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upcoming Events */}
            <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Upcoming Events
                  {favoritesOnly && <span className="ml-2 text-sm text-green-500">(Favorites)</span>}
                </h2>
                <a href="/sports" className="text-green-500 hover:text-green-400 text-sm font-medium">
                  View all
                </a>
              </div>

              {error ? (
                <ErrorDisplay error={error} onRetry={() => eventsQuery.refetch()} />
              ) : loading && upcomingEvents.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                    <span>Loading your events…</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">
                    This is live data. If this is your first login, it may take a moment to populate.
                  </p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  {favoritesOnly
                    ? 'No upcoming events for your favorite teams. Add more favorites or turn off the filter.'
                    : 'No upcoming events found.'
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      formatTime={formatEventTime}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Live Events */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Live Events</h2>
                <span className="flex items-center text-red-500 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  Live
                </span>
              </div>

              {loading && liveEvents.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                    <span>Loading live events…</span>
                  </div>
                </div>
              ) : liveEvents.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  {favoritesOnly
                    ? 'No live events for your favorite teams right now.'
                    : 'No live events right now.'
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {liveEvents.map((event) => (
                    <LiveEventCard
                      key={event.id}
                      event={event}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  testId?: string;
}

function StatCard({ title, value, change, changeType, icon, testId }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-green-500' :
            changeType === 'negative' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-white" data-testid={testId}>{value}</div>
        <div className="text-gray-400 text-sm mt-1">{title}</div>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  formatTime: (date: string) => string;
}

function EventCard({ event, formatTime }: EventCardProps) {
  return (
    <a
      href={`/event/${event.id}`}
      className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">
            {event.league} - {event.sport}
          </div>
          <div className="font-medium text-white">
            {event.homeTeam} vs {event.awayTeam}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {formatTime(event.startTime)}
          </div>
        </div>
        <div className="flex items-center">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
            View Odds
          </span>
        </div>
      </div>
    </a>
  );
}

interface LiveEventCardProps {
  event: Event;
}

function LiveEventCard({ event }: LiveEventCardProps) {
  return (
    <a
      href={`/event/${event.id}`}
      className="block p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <div className="text-xs text-gray-400 mb-2">{event.league}</div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-white font-medium text-sm">{event.homeTeam}</div>
          <div className="text-white font-medium text-sm">{event.awayTeam}</div>
        </div>
        <div className="text-center px-3">
          <span className="flex items-center text-red-500 text-xs">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
            LIVE
          </span>
        </div>
      </div>
    </a>
  );
}
