import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { PullToRefresh } from '../../components/PullToRefresh';
import { api, getErrorMessage } from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';

interface BankrollData {
  currentBankroll: number;
  startingBankroll: number;
  peakBalance: number;
  maxDrawdown: number;
  drawdownPercentage: number;
  riskMode: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HYBRID';
}

interface TodaysPick {
  id: string;
  event: string;
  league: string;
  pickType: string;
  odds: number;
  stake: number;
  edge: number;
  confidence: number;
  status: 'pending' | 'won' | 'lost';
  timestamp: string;
}

interface MartingaleStatus {
  currentLevel: number;
  mode: string;
  safetyCap: number;
  activeSequences: number;
  recoveryMode: boolean;
}

interface BetHistoryItem {
  id: string;
  date: string;
  event: string;
  pick: string;
  odds: number;
  stake: number;
  result: 'won' | 'lost' | 'pending';
  pnl: number;
}

interface PerformanceStats {
  winRate: number;
  roi: number;
  averageOdds: number;
  bestDay: number;
  worstDay: number;
  currentStreak: {
    type: 'wins' | 'losses';
    count: number;
  };
}

export function StrategyPage() {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Fetch bankroll data
  const bankrollQuery = useQuery<BankrollData>({
    queryKey: ['strategy-bankroll'],
    queryFn: async () => {
      const response = await api.get('/api/strategy/bankroll');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch today's picks
  const picksQuery = useQuery<TodaysPick[]>({
    queryKey: ['strategy-today'],
    queryFn: async () => {
      const response = await api.get('/api/strategy/today');
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 mins
  });

  // Fetch Martingale status
  const martingaleQuery = useQuery<MartingaleStatus>({
    queryKey: ['strategy-martingale'],
    queryFn: async () => {
      const response = await api.get('/api/strategy/martingale/status');
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch betting history
  const historyQuery = useQuery<BetHistoryItem[]>({
    queryKey: ['strategy-history', historyFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyFilter !== 'all') params.append('status', historyFilter);
      if (dateRange !== 'all') params.append('range', dateRange);
      const response = await api.get(`/api/strategy/history?${params}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch performance stats
  const performanceQuery = useQuery<PerformanceStats>({
    queryKey: ['strategy-performance'],
    queryFn: async () => {
      const response = await api.get('/api/strategy/performance');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const bankroll = bankrollQuery.data;
  const todaysPicks = picksQuery.data || [];
  const martingaleStatus = martingaleQuery.data;
  const history = historyQuery.data || [];
  const performance = performanceQuery.data;

  // Calculate running total P&L
  const runningTotal = useMemo(() => {
    return history.reduce((total, bet) => total + (bet.result !== 'pending' ? bet.pnl : 0), 0);
  }, [history]);

  // Get bankroll health color
  const getBankrollHealthColor = (drawdownPercentage: number) => {
    if (drawdownPercentage <= 5) return 'text-green-500';
    if (drawdownPercentage <= 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get bankroll health status
  const getBankrollHealthStatus = (drawdownPercentage: number) => {
    if (drawdownPercentage <= 5) return 'Excellent';
    if (drawdownPercentage <= 15) return 'Good';
    if (drawdownPercentage <= 25) return 'Warning';
    return 'Critical';
  };

  const getRiskModeColor = (mode: string) => {
    switch (mode) {
      case 'CONSERVATIVE': return 'bg-blue-500/20 text-blue-400';
      case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400';
      case 'AGGRESSIVE': return 'bg-red-500/20 text-red-400';
      case 'HYBRID': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500/20 text-green-400';
      case 'lost': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleRefresh = async () => {
    await Promise.all([
      bankrollQuery.refetch(),
      picksQuery.refetch(),
      martingaleQuery.refetch(),
      historyQuery.refetch(),
      performanceQuery.refetch(),
    ]);
  };

  const error = bankrollQuery.error || picksQuery.error || martingaleQuery.error || 
                historyQuery.error || performanceQuery.error;

  if (error) {
    return (
      <Layout>
        <div className="p-4">
          <ErrorDisplay 
            error={getErrorMessage(error)}
            onRetry={handleRefresh}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Strategy & Bankroll</h1>
              <p className="text-gray-400">Manage your betting strategy and bankroll</p>
            </div>
          </div>

          {/* 1. Bankroll Overview */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Bankroll Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-500 mb-2">
                  {bankroll ? formatCurrency(bankroll.currentBankroll) : '—'}
                </div>
                <div className="text-gray-400 text-sm">Current Bankroll</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-semibold text-white mb-1">
                  {bankroll ? formatCurrency(bankroll.startingBankroll) : '—'}
                </div>
                <div className="text-gray-400 text-sm">Starting Bankroll</div>
                <div className="text-xs text-green-400 mt-1">
                  {bankroll ? `+${(((bankroll.currentBankroll - bankroll.startingBankroll) / bankroll.startingBankroll) * 100).toFixed(1)}%` : ''}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-semibold text-white mb-1">
                  {bankroll ? formatCurrency(bankroll.peakBalance) : '—'}
                </div>
                <div className="text-gray-400 text-sm">Peak Balance</div>
              </div>
              
              <div className="text-center">
                <div className={`text-xl font-semibold mb-1 ${bankroll ? getBankrollHealthColor(bankroll.drawdownPercentage) : 'text-gray-400'}`}>
                  {bankroll ? `${bankroll.drawdownPercentage.toFixed(1)}%` : '—'}
                </div>
                <div className="text-gray-400 text-sm">Max Drawdown</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Risk Mode</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${bankroll ? getRiskModeColor(bankroll.riskMode) : 'bg-gray-500/20 text-gray-400'}`}>
                    {bankroll?.riskMode || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Bankroll Health</div>
                <div className={`text-lg font-semibold ${bankroll ? getBankrollHealthColor(bankroll.drawdownPercentage) : 'text-gray-400'}`}>
                  {bankroll ? getBankrollHealthStatus(bankroll.drawdownPercentage) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Today's Picks */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Today's Picks</h2>
            
            {picksQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : todaysPicks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No picks available for today</div>
                <div className="text-sm text-gray-500">Check back later for new opportunities</div>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysPicks.map((pick) => (
                  <div key={pick.id} className="bg-gray-700/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-white">{pick.event}</div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(pick.status)}`}>
                          {pick.status.charAt(0).toUpperCase() + pick.status.slice(1)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mb-1">{pick.league} • {pick.pickType}</div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(pick.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-white font-semibold">{pick.odds > 0 ? `+${pick.odds}` : pick.odds}</div>
                        <div className="text-gray-400">Odds</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-semibold">{formatCurrency(pick.stake)}</div>
                        <div className="text-gray-400">Stake</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-semibold">{pick.edge.toFixed(1)}%</div>
                        <div className="text-gray-400">Edge</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-400 font-semibold">{pick.confidence}%</div>
                        <div className="text-gray-400">Confidence</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Martingale Engine Status */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Martingale Engine</h2>
            
            {martingaleQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500 mb-1">
                    {martingaleStatus?.currentLevel || 0}
                  </div>
                  <div className="text-gray-400 text-sm">Current Level</div>
                  <div className="text-xs text-gray-500 mt-1">Max: 5</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">
                    {martingaleStatus?.mode || 'Standard'}
                  </div>
                  <div className="text-gray-400 text-sm">Mode</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">
                    {martingaleStatus ? formatCurrency(martingaleStatus.safetyCap) : '—'}
                  </div>
                  <div className="text-gray-400 text-sm">Safety Cap</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">
                    {martingaleStatus?.activeSequences || 0}
                  </div>
                  <div className="text-gray-400 text-sm">Active Sequences</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-semibold mb-1 ${martingaleStatus?.recoveryMode ? 'text-yellow-400' : 'text-green-400'}`}>
                    {martingaleStatus?.recoveryMode ? 'ON' : 'OFF'}
                  </div>
                  <div className="text-gray-400 text-sm">Recovery Mode</div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Betting History & 5. Performance Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Stats */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Performance</h2>
              
              {performanceQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {performance ? `${performance.winRate.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-gray-400 text-sm">Win Rate</div>
                  </div>
                  
                  <div>
                    <div className={`text-lg font-semibold ${performance?.roi && performance.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {performance ? `${performance.roi >= 0 ? '+' : ''}${performance.roi.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-gray-400 text-sm">ROI</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {performance ? performance.averageOdds.toFixed(1) : '—'}
                    </div>
                    <div className="text-gray-400 text-sm">Avg Odds</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold text-green-400">
                      {performance ? formatCurrency(performance.bestDay) : '—'}
                    </div>
                    <div className="text-gray-400 text-sm">Best Day</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold text-red-400">
                      {performance ? formatCurrency(performance.worstDay) : '—'}
                    </div>
                    <div className="text-gray-400 text-sm">Worst Day</div>
                  </div>
                  
                  {performance?.currentStreak && (
                    <div>
                      <div className={`text-lg font-semibold ${performance.currentStreak.type === 'wins' ? 'text-green-400' : 'text-red-400'}`}>
                        {performance.currentStreak.count} {performance.currentStreak.type}
                      </div>
                      <div className="text-gray-400 text-sm">Current Streak</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Betting History */}
            <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-white">Betting History</h2>
                
                <div className="flex gap-2">
                  <select 
                    value={historyFilter} 
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="pending">Pending</option>
                  </select>
                  
                  <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm"
                  >
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No betting history found</div>
                  <div className="text-sm text-gray-500">Start placing bets to see your history</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Running Total */}
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">Running Total P&L</div>
                      <div className={`text-lg font-semibold ${runningTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {runningTotal >= 0 ? '+' : ''}{formatCurrency(runningTotal)}
                      </div>
                    </div>
                  </div>

                  {/* History Table - Mobile Responsive */}
                  <div className="space-y-3 lg:space-y-0">
                    {/* Desktop Table Header - Hidden on mobile */}
                    <div className="hidden lg:grid lg:grid-cols-7 gap-4 pb-2 border-b border-gray-700 text-sm text-gray-400 font-medium">
                      <div>Date</div>
                      <div>Event</div>
                      <div>Pick</div>
                      <div>Odds</div>
                      <div>Stake</div>
                      <div>Result</div>
                      <div>P&L</div>
                    </div>

                    {/* History Items */}
                    {history.map((bet) => (
                      <div key={bet.id} className="lg:grid lg:grid-cols-7 lg:gap-4 lg:py-3 lg:border-b lg:border-gray-700/50 bg-gray-700/25 lg:bg-transparent rounded-lg lg:rounded-none p-4 lg:p-0">
                        {/* Mobile Layout */}
                        <div className="lg:hidden space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-white">{bet.event}</div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(bet.result)}`}>
                              {bet.result.charAt(0).toUpperCase() + bet.result.slice(1)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">{bet.pick}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Date: </span>
                              <span className="text-white">{format(new Date(bet.date), 'MMM d, yyyy')}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Odds: </span>
                              <span className="text-white">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Stake: </span>
                              <span className="text-white">{formatCurrency(bet.stake)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">P&L: </span>
                              <span className={bet.result === 'pending' ? 'text-gray-400' : bet.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {bet.result === 'pending' ? '—' : `${bet.pnl >= 0 ? '+' : ''}${formatCurrency(bet.pnl)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:contents text-sm">
                          <div className="text-gray-400">{format(new Date(bet.date), 'MMM d, yyyy')}</div>
                          <div className="text-white font-medium">{bet.event}</div>
                          <div className="text-gray-300">{bet.pick}</div>
                          <div className="text-white">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</div>
                          <div className="text-white">{formatCurrency(bet.stake)}</div>
                          <div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(bet.result)} inline-block`}>
                              {bet.result.charAt(0).toUpperCase() + bet.result.slice(1)}
                            </div>
                          </div>
                          <div className={bet.result === 'pending' ? 'text-gray-400' : bet.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {bet.result === 'pending' ? '—' : `${bet.pnl >= 0 ? '+' : ''}${formatCurrency(bet.pnl)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}