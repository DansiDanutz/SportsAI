import { useState, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  roi: number;
  winRate: number;
  totalBets: number;
  streak: number;
  badge: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  monthlyPnl: number;
  isCurrentUser?: boolean;
}

type TimeFilter = '7d' | '30d' | '90d' | 'all';
type Category = 'overall' | 'arbitrage' | 'accumulators' | 'ai-picks';

const BADGE_CONFIG = {
  bronze: { color: 'text-amber-700', bg: 'bg-amber-900/20', icon: '🥉', label: 'Bronze' },
  silver: { color: 'text-gray-300', bg: 'bg-gray-700/30', icon: '🥈', label: 'Silver' },
  gold: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: '🥇', label: 'Gold' },
  diamond: { color: 'text-cyan-400', bg: 'bg-cyan-900/20', icon: '💎', label: 'Diamond' },
  legend: { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: '👑', label: 'Legend' },
};

/* Real leaderboard data only - no demo content */

export function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [category, setCategory] = useState<Category>('overall');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['leaderboard', timeFilter, category],
    queryFn: async () => {
      const res = await api.get(`/leaderboard?period=${timeFilter}&category=${category}`);
      return res.data as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return entries;
    return entries.filter(e => e.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [entries, searchQuery]);

  const currentUser = entries.find(e => e.isCurrentUser);

  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const categoryOptions: { value: Category; label: string; icon: string }[] = [
    { value: 'overall', label: 'Overall', icon: '🏆' },
    { value: 'arbitrage', label: 'Arbitrage', icon: '⚡' },
    { value: 'accumulators', label: 'Accumulators', icon: '🎯' },
    { value: 'ai-picks', label: 'AI Picks', icon: '🤖' },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🏆 Leaderboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Top performers ranked by ROI
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-56"
            />
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">🔍</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                category === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1 w-fit">
          {timeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeFilter === opt.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          /* Error State - No Data */
          <div className="bg-gray-800/80 rounded-2xl p-8 border border-gray-700/50 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Leaderboard Data Yet</h3>
            <p className="text-gray-400 mb-4">
              The leaderboard will populate once users start betting and building their performance records.
            </p>
            <div className="text-sm text-gray-500">
              Check back soon to see the top performers!
            </div>
          </div>
        ) : (
          <>
        {/* Your Position Banner */}
        {currentUser && (
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                #{currentUser.rank}
              </div>
              <div>
                <span className="text-white font-medium">Your Position</span>
                <div className="text-gray-400 text-xs">
                  {BADGE_CONFIG[currentUser.badge].icon} {BADGE_CONFIG[currentUser.badge].label} Tier
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-right">
                <div className="text-green-400 font-bold">+{currentUser.roi}%</div>
                <div className="text-gray-500 text-xs">ROI</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{currentUser.winRate}%</div>
                <div className="text-gray-500 text-xs">Win Rate</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">${currentUser.monthlyPnl}</div>
                <div className="text-gray-500 text-xs">Monthly P&L</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {filtered.slice(0, 3).map((entry, i) => {
            const podiumOrder = [1, 0, 2]; // silver, gold, bronze display order
            const e = filtered[podiumOrder[i]];
            if (!e) return null;
            const isFirst = podiumOrder[i] === 0;
            return (
              <div
                key={e.rank}
                className={`rounded-xl p-4 text-center ${
                  isFirst
                    ? 'bg-gradient-to-b from-yellow-900/30 to-gray-800 border border-yellow-700/30 -mt-2'
                    : 'bg-gray-800 border border-gray-700/50'
                }`}
              >
                <div className="text-3xl mb-1">
                  {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : '🥉'}
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-2 flex items-center justify-center text-lg font-bold text-white">
                  {e.username.charAt(0)}
                </div>
                <div className="text-white font-semibold text-sm truncate">{e.username}</div>
                <div className={`text-lg font-bold mt-1 ${e.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  +{e.roi}% ROI
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {e.winRate}% WR · {e.totalBets} bets
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Leaderboard Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700/50">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-right px-4 py-3">ROI</th>
                  <th className="text-right px-4 py-3">Win Rate</th>
                  <th className="text-right px-4 py-3">Bets</th>
                  <th className="text-right px-4 py-3">Streak</th>
                  <th className="text-right px-4 py-3">Monthly P&L</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const badge = BADGE_CONFIG[entry.badge];
                  return (
                    <tr
                      key={entry.rank}
                      className={`border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors ${
                        entry.isCurrentUser ? 'bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className={`font-bold ${entry.rank <= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-bold text-white">
                            {entry.username.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium flex items-center gap-1">
                              {entry.username}
                              {entry.isCurrentUser && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">YOU</span>
                              )}
                            </div>
                            <div className={`text-[10px] ${badge.color}`}>
                              {badge.icon} {badge.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${entry.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.roi > 0 ? '+' : ''}{entry.roi}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{entry.winRate}%</td>
                      <td className="px-4 py-3 text-right text-gray-400">{entry.totalBets}</td>
                      <td className="px-4 py-3 text-right">
                        {entry.streak > 0 ? (
                          <span className="text-orange-400">🔥 {entry.streak}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={entry.monthlyPnl > 0 ? 'text-green-400' : 'text-red-400'}>
                          ${entry.monthlyPnl.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Footer - Only show when we have real data */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Users', value: entries.length.toString(), icon: '👥' },
              { label: 'Top ROI', value: `${Math.max(...entries.map(e => e.roi))}%`, icon: '📊' },
              { label: 'Avg Win Rate', value: `${Math.round(entries.reduce((sum, e) => sum + e.winRate, 0) / entries.length)}%`, icon: '🎯' },
              { label: 'Total Bets', value: entries.reduce((sum, e) => sum + e.totalBets, 0).toLocaleString(), icon: '💰' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3 text-center border border-gray-700/30">
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className="text-white font-bold">{stat.value}</div>
                <div className="text-gray-500 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </Layout>
  );
}
