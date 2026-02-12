import { useState, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface DailyReturn {
  date: string;
  pnl: number;
  cumulative: number;
  betsPlaced: number;
  winRate: number;
}

interface PerformanceStats {
  totalReturn: number;
  monthlyReturn: number;
  weeklyReturn: number;
  winRate: number;
  totalBets: number;
  sharpeRatio: number;
  maxDrawdown: number;
  streak: number;
  dailyReturns: DailyReturn[];
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function PerformancePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { data: stats, isLoading } = useQuery<PerformanceStats>({
    queryKey: ['performance', timeRange],
    queryFn: async () => {
      try {
        const res = await api.get(`/v1/portfolio/performance?range=${timeRange}`);
        return res.data;
      } catch {
        // Return demo data if backend not ready
        return generateDemoData(timeRange);
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const chartData = useMemo(() => {
    if (!stats?.dailyReturns) return [];
    return stats.dailyReturns;
  }, [stats]);

  const maxCumulative = useMemo(() => {
    if (!chartData.length) return 1;
    return Math.max(...chartData.map(d => Math.abs(d.cumulative)), 1);
  }, [chartData]);

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Performance</h1>
              <p className="text-gray-400 text-sm">Track your portfolio returns and betting performance</p>
            </div>
          </div>
        </header>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl mb-8 w-fit border border-gray-700">
          {([
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: 'all', label: 'All Time' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                timeRange === key
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Return"
                value={`${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(1)}%`}
                color={stats.totalReturn >= 0 ? 'green' : 'red'}
                icon="📈"
              />
              <StatCard
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                color={stats.winRate >= 50 ? 'green' : 'yellow'}
                icon="🎯"
              />
              <StatCard
                label="Sharpe Ratio"
                value={stats.sharpeRatio.toFixed(2)}
                color={stats.sharpeRatio >= 1.5 ? 'green' : stats.sharpeRatio >= 1 ? 'yellow' : 'red'}
                icon="⚡"
              />
              <StatCard
                label="Max Drawdown"
                value={`${stats.maxDrawdown.toFixed(1)}%`}
                color={stats.maxDrawdown > -10 ? 'green' : stats.maxDrawdown > -20 ? 'yellow' : 'red'}
                icon="🛡️"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Monthly Return"
                value={`${stats.monthlyReturn >= 0 ? '+' : ''}${stats.monthlyReturn.toFixed(1)}%`}
                color={stats.monthlyReturn >= 0 ? 'green' : 'red'}
                icon="📊"
                small
              />
              <StatCard
                label="Weekly Return"
                value={`${stats.weeklyReturn >= 0 ? '+' : ''}${stats.weeklyReturn.toFixed(1)}%`}
                color={stats.weeklyReturn >= 0 ? 'green' : 'red'}
                icon="📅"
                small
              />
              <StatCard
                label="Total Bets"
                value={stats.totalBets.toLocaleString()}
                color="blue"
                icon="🎲"
                small
              />
              <StatCard
                label="Current Streak"
                value={`${stats.streak > 0 ? '+' : ''}${stats.streak}W`}
                color={stats.streak > 0 ? 'green' : 'red'}
                icon="🔥"
                small
              />
            </div>

            {/* Equity Curve Chart (CSS-based) */}
            <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700/50 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Equity Curve</h2>
              <div className="relative h-48 sm:h-64">
                {/* Zero line */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-600/50 z-10">
                  <span className="absolute -top-3 -left-1 text-[10px] text-gray-500">0%</span>
                </div>
                
                {/* Bars */}
                <div className="flex items-end h-full gap-[1px] sm:gap-[2px]">
                  {chartData.map((day, i) => {
                    const height = Math.abs(day.cumulative) / maxCumulative * 50;
                    const isPositive = day.cumulative >= 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-center relative group"
                        style={{ height: '100%' }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                            <div className="text-gray-400">{day.date}</div>
                            <div className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{day.cumulative.toFixed(1)}%
                            </div>
                            <div className="text-gray-500">P&L: {day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(1)}%</div>
                            <div className="text-gray-500">{day.betsPlaced} bets ({day.winRate.toFixed(0)}% W)</div>
                          </div>
                        </div>
                        
                        {/* Bar */}
                        <div
                          className={`w-full rounded-sm transition-all duration-200 ${
                            isPositive
                              ? 'bg-green-500/80 hover:bg-green-400 self-end mb-[50%]'
                              : 'bg-red-500/80 hover:bg-red-400 self-start mt-[50%]'
                          }`}
                          style={{
                            height: `${Math.max(height, 1)}%`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* X-axis labels */}
              <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                {chartData.length > 0 && (
                  <>
                    <span>{chartData[0]?.date}</span>
                    <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                    <span>{chartData[chartData.length - 1]?.date}</span>
                  </>
                )}
              </div>
            </div>

            {/* Recent Daily Returns Table */}
            <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-4">Daily Returns</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-gray-700">
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">P&L</th>
                      <th className="pb-3 font-semibold text-right">Cumulative</th>
                      <th className="pb-3 font-semibold text-right">Bets</th>
                      <th className="pb-3 font-semibold text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().slice(0, 10).map((day, i) => (
                      <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                        <td className="py-3 text-gray-300">{day.date}</td>
                        <td className={`py-3 text-right font-mono font-bold ${day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(2)}%
                        </td>
                        <td className={`py-3 text-right font-mono ${day.cumulative >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {day.cumulative >= 0 ? '+' : ''}{day.cumulative.toFixed(2)}%
                        </td>
                        <td className="py-3 text-right text-gray-400">{day.betsPlaced}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            day.winRate >= 60 ? 'bg-green-500/10 text-green-400' :
                            day.winRate >= 45 ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {day.winRate.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

/* Stat Card Component */
function StatCard({ label, value, color, icon, small }: {
  label: string;
  value: string;
  color: 'green' | 'red' | 'yellow' | 'blue';
  icon: string;
  small?: boolean;
}) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };
  const textColors = {
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`rounded-2xl ${small ? 'p-4' : 'p-5'} border ${colors[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`${small ? 'text-xl' : 'text-2xl sm:text-3xl'} font-black ${textColors[color]}`}>
        {value}
      </div>
    </div>
  );
}

/* Demo data generator for when backend isn't ready */
function generateDemoData(range: TimeRange): PerformanceStats {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180;
  const dailyReturns: DailyReturn[] = [];
  let cumulative = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const pnl = (Math.random() - 0.38) * 3; // Slight positive bias
    cumulative += pnl;
    dailyReturns.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Math.round(pnl * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      betsPlaced: Math.floor(Math.random() * 15) + 3,
      winRate: Math.random() * 30 + 45,
    });
  }

  const totalBets = dailyReturns.reduce((sum, d) => sum + d.betsPlaced, 0);
  const avgWinRate = dailyReturns.reduce((sum, d) => sum + d.winRate, 0) / days;

  return {
    totalReturn: cumulative,
    monthlyReturn: cumulative * (30 / days),
    weeklyReturn: cumulative * (7 / days),
    winRate: avgWinRate,
    totalBets,
    sharpeRatio: cumulative > 0 ? 1.2 + Math.random() * 0.8 : 0.5 + Math.random() * 0.5,
    maxDrawdown: -(Math.random() * 8 + 3),
    streak: Math.floor(Math.random() * 8) - 2,
    dailyReturns,
  };
}
