import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

interface AccumulatorLeg {
  id: string;
  matchName: string;
  pick: string;
  odds: number;
  confidence: number;
  status?: 'pending' | 'won' | 'lost';
}

interface AccumulatorTicket {
  id: string;
  type: 'odds2+' | 'odds3+';
  legs: AccumulatorLeg[];
  combinedOdds: number;
  stake: number;
  potentialReturn: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: string;
  resolvedAt?: string;
  pnl?: number;
}

interface AccumulatorStats {
  bankroll: number;
  totalPnl: number;
  odds2PlusWinRate: number;
  odds3PlusWinRate: number;
  currentStreak: number;
  streakType: 'wins' | 'losses';
}

interface HistoryTicket {
  id: string;
  date: string;
  type: 'odds2+' | 'odds3+';
  combinedOdds: number;
  stake: number;
  status: 'won' | 'lost' | 'pending';
  pnl: number;
}

export function AccumulatorsPage() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Fetch today's tickets
  const { data: todaysTickets, isLoading: ticketsLoading } = useQuery<AccumulatorTicket[]>({
    queryKey: ['accumulators', 'today'],
    queryFn: () => api.get('/api/strategy/accumulators/today').then(res => res.data),
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<AccumulatorStats>({
    queryKey: ['accumulators', 'stats'],
    queryFn: () => api.get('/api/strategy/accumulators/stats').then(res => res.data),
  });

  // Fetch history
  const { data: history, isLoading: historyLoading } = useQuery<HistoryTicket[]>({
    queryKey: ['accumulators', 'history'],
    queryFn: () => api.get('/api/strategy/accumulators/history').then(res => res.data),
  });

  // Generate new tickets mutation
  const generateMutation = useMutation({
    mutationFn: () => api.post('/api/strategy/accumulators/generate'),
    onMutate: () => setIsGenerating(true),
    onSettled: () => setIsGenerating(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulators'] });
    },
  });

  // Resolve tickets mutation
  const resolveMutation = useMutation({
    mutationFn: () => api.post('/api/strategy/accumulators/resolve'),
    onMutate: () => setIsResolving(true),
    onSettled: () => setIsResolving(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulators'] });
    },
  });

  const renderTicketCard = (ticket: AccumulatorTicket) => {
    const isOdds2Plus = ticket.type === 'odds2+';
    const cardColor = isOdds2Plus ? 'border-blue-500/30' : 'border-purple-500/30';
    const accentColor = isOdds2Plus ? 'text-blue-500' : 'text-purple-500';
    const bgColor = isOdds2Plus ? 'bg-blue-500/10' : 'bg-purple-500/10';
    
    return (
      <div key={ticket.id} className={`bg-gray-800 rounded-3xl p-6 lg:p-8 border ${cardColor} hover:border-opacity-80 transition-all group`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {isOdds2Plus ? 'Odds 2+ Ticket' : 'Odds 3+ Ticket'}
            </h3>
            <div className="flex items-center space-x-3">
              <span className={`${accentColor} font-mono font-bold text-lg`}>
                @{ticket.combinedOdds.toFixed(2)}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{ticket.legs.length} legs</span>
            </div>
          </div>
          <div className={`${bgColor} border ${isOdds2Plus ? 'border-blue-500/20' : 'border-purple-500/20'} px-4 py-3 rounded-2xl`}>
            <div className="text-center">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Stake</div>
              <div className="text-xl font-black text-white">${ticket.stake}</div>
            </div>
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-3 mb-6">
          {ticket.legs.map((leg, idx) => (
            <div key={leg.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex justify-between items-start mb-2">
                <div className="text-white font-semibold text-sm">{leg.matchName}</div>
                <div className={`${accentColor} font-bold`}>@{leg.odds.toFixed(2)}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 ${bgColor} ${accentColor} rounded text-xs font-bold`}>
                  {leg.pick}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isOdds2Plus ? 'bg-blue-500' : 'bg-purple-500'} transition-all`}
                      style={{ width: `${leg.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{leg.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Potential Return */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Potential Return</div>
            <div className="text-2xl font-black text-green-500">${ticket.potentialReturn.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-bold uppercase">Profit</div>
            <div className="text-xl font-bold text-green-400">+${(ticket.potentialReturn - ticket.stake).toFixed(2)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Daily Accumulators</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            AI-powered accumulator tickets with intelligent stake management and confidence-based selections.
          </p>
        </header>

        {/* Stats Bar */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-400 font-bold uppercase">Bankroll</div>
              <div className="text-2xl font-black text-white">${stats.bankroll.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-400 font-bold uppercase">Total P&L</div>
              <div className={`text-2xl font-black ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-blue-400 font-bold uppercase">2+ Win Rate</div>
              <div className="text-2xl font-black text-blue-500">{stats.odds2PlusWinRate.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-purple-400 font-bold uppercase">3+ Win Rate</div>
              <div className="text-2xl font-black text-purple-500">{stats.odds3PlusWinRate.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-400 font-bold uppercase">Streak</div>
              <div className={`text-2xl font-black ${stats.streakType === 'wins' ? 'text-green-500' : 'text-red-500'}`}>
                {stats.currentStreak} {stats.streakType === 'wins' ? 'W' : 'L'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            className="flex-1 py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Generate New Tickets</span>
              </>
            )}
          </button>
          <button
            onClick={() => resolveMutation.mutate()}
            disabled={isResolving}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            {isResolving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Resolve Pending</span>
              </>
            )}
          </button>
        </div>

        {/* Today's Tickets */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <span>Today's Tickets</span>
            {!ticketsLoading && todaysTickets && (
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
                {todaysTickets.length} active
              </span>
            )}
          </h2>
          
          {ticketsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-gray-800 rounded-3xl p-8 border border-gray-700 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-6 w-2/3"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="bg-gray-700 rounded-xl p-4 h-16"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : todaysTickets && todaysTickets.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {todaysTickets.map(renderTicketCard)}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-800/50 rounded-3xl border border-dashed border-gray-700">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Tickets</h3>
              <p className="text-gray-500">Generate new accumulator tickets to get started.</p>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Ticket History</h2>
          
          {historyLoading ? (
            <div className="bg-gray-800 rounded-xl overflow-hidden animate-pulse">
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ) : history && history.length > 0 ? (
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Odds</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Stake</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {history.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(ticket.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            ticket.type === 'odds2+' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {ticket.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-300">
                          @{ticket.combinedOdds.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-300">
                          ${ticket.stake.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            ticket.status === 'won' 
                              ? 'bg-green-500/20 text-green-400'
                              : ticket.status === 'lost'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">
                          <span className={ticket.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {ticket.pnl >= 0 ? '+' : ''}${ticket.pnl.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold text-gray-400 mb-2">No History Yet</h3>
              <p className="text-gray-500">Your ticket history will appear here once you start betting.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}