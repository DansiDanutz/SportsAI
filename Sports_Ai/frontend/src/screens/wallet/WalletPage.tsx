import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { PullToRefresh } from '../../components/PullToRefresh';
import { useAuthStore } from '../../store/authStore';
import { api, getErrorMessage } from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';

interface WalletBalance {
  totalBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netProfit: number;
  userShare: number;
  platformFee: number;
  availableToWithdraw: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'bet-win' | 'bet-loss' | 'fee';
  amount: number;
  balanceAfter: number;
  description?: string;
}

interface FundPerformance {
  monthlyRoi: number;
  currentMonthPnL: number;
  winRate: number;
  totalBets: number;
}

interface AutonomousStatus {
  isActive: boolean;
  activeBetsCount: number;
  totalManagedAmount: number;
}

export function WalletPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Fetch wallet balance
  const balanceQuery = useQuery<WalletBalance>({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const response = await api.get('/api/wallet/balance');
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  // Fetch transaction history
  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const response = await api.get('/api/wallet/transactions');
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch fund performance
  const performanceQuery = useQuery<FundPerformance>({
    queryKey: ['fund-performance'],
    queryFn: async () => {
      const response = await api.get('/api/fund/performance');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch autonomous engine status
  const autonomousQuery = useQuery<AutonomousStatus>({
    queryKey: ['autonomous-status'],
    queryFn: async () => {
      const response = await api.get('/api/autonomous/status');
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await api.post('/api/wallet/deposit', { amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setDepositAmount('');
      setIsDepositing(false);
    },
    onError: (error) => {
      console.error('Deposit failed:', error);
      setIsDepositing(false);
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await api.post('/api/wallet/withdraw', { amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setWithdrawAmount('');
      setIsWithdrawing(false);
    },
    onError: (error) => {
      console.error('Withdrawal failed:', error);
      setIsWithdrawing(false);
    },
  });

  // Toggle autonomous engine
  const toggleAutonomousMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const response = await api.post('/api/autonomous/toggle', { active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-status'] });
    },
  });

  // Kill switch (emergency stop)
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/autonomous/kill-switch');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-status'] });
    },
  });

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount < 100) {
      alert('Minimum deposit is $100');
      return;
    }
    setIsDepositing(true);
    depositMutation.mutate(amount);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!balanceQuery.data || amount > balanceQuery.data.availableToWithdraw) {
      alert('Insufficient balance available for withdrawal');
      return;
    }
    setIsWithdrawing(true);
    withdrawMutation.mutate(amount);
  };

  const handleToggleAutonomous = () => {
    if (!autonomousQuery.data) return;
    toggleAutonomousMutation.mutate(!autonomousQuery.data.isActive);
  };

  const handleKillSwitch = () => {
    if (window.confirm('Are you sure you want to activate the kill switch? This will stop all autonomous betting immediately.')) {
      killSwitchMutation.mutate();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💳';
      case 'withdrawal':
        return '💰';
      case 'bet-win':
        return '🎯';
      case 'bet-loss':
        return '📉';
      case 'fee':
        return '🔧';
      default:
        return '📊';
    }
  };

  const isLoading = balanceQuery.isLoading || transactionsQuery.isLoading || performanceQuery.isLoading || autonomousQuery.isLoading;
  const hasError = balanceQuery.error || transactionsQuery.error || performanceQuery.error || autonomousQuery.error;

  if (hasError) {
    return (
      <Layout>
        <ErrorDisplay
          error={hasError}
          onRetry={() => {
            balanceQuery.refetch();
            transactionsQuery.refetch();
            performanceQuery.refetch();
            autonomousQuery.refetch();
          }}
        />
      </Layout>
    );
  }

  const balance = balanceQuery.data;
  const transactions = transactionsQuery.data || [];
  const performance = performanceQuery.data;
  const autonomousStatus = autonomousQuery.data;

  return (
    <Layout>
      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([
            balanceQuery.refetch(),
            transactionsQuery.refetch(),
            performanceQuery.refetch(),
            autonomousQuery.refetch(),
          ]);
        }}
      >
        <div className="min-h-screen bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Wallet & Fund Management</h1>
              <p className="text-gray-400">Manage your deposits, withdrawals, and track autonomous fund performance</p>
            </div>

            {/* Balance Overview */}
            <div className="mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-center mb-6">
                  <h2 className="text-lg text-gray-400 mb-2">Your Balance</h2>
                  <div className="text-4xl sm:text-5xl font-bold text-white">
                    {balance ? formatCurrency(balance.totalBalance) : '—'}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Total Deposited</div>
                    <div className="text-xl font-semibold text-green-400">
                      {balance ? formatCurrency(balance.totalDeposited) : '—'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Total Withdrawn</div>
                    <div className="text-xl font-semibold text-blue-400">
                      {balance ? formatCurrency(balance.totalWithdrawn) : '—'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Net Profit/Loss</div>
                    <div className={`text-xl font-semibold ${balance && balance.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {balance ? formatCurrency(balance.netProfit) : '—'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Available to Withdraw</div>
                    <div className="text-xl font-semibold text-yellow-400">
                      {balance ? formatCurrency(balance.availableToWithdraw) : '—'}
                    </div>
                  </div>
                </div>

                {/* Profit Share Breakdown */}
                {balance && balance.netProfit > 0 && (
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Profit Share Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Your Share (90%)</div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatCurrency(balance.userShare)}
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Platform Fee (10%)</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {formatCurrency(balance.platformFee)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Deposit Section */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">💳 Deposit Funds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount (minimum $100)
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter amount..."
                    />
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) < 100 || isDepositing || depositMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isDepositing || depositMutation.isPending ? 'Processing...' : 'Deposit'}
                  </button>
                </div>
              </div>

              {/* Withdrawal Section */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">💰 Withdraw Funds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Available: {balance ? formatCurrency(balance.availableToWithdraw) : '—'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount..."
                    />
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || !balance || parseFloat(withdrawAmount) > balance.availableToWithdraw || isWithdrawing || withdrawMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isWithdrawing || withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Fund Performance */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">📈 Fund Performance</h3>
                {performance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Monthly ROI</div>
                        <div className={`text-2xl font-bold ${performance.monthlyRoi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(performance.monthlyRoi)}
                        </div>
                      </div>
                      <div className="text-center bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Current Month P&L</div>
                        <div className={`text-2xl font-bold ${performance.currentMonthPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(performance.currentMonthPnL)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Win Rate</div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatPercentage(performance.winRate)}
                        </div>
                      </div>
                      <div className="text-center bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400">Total Bets</div>
                        <div className="text-2xl font-bold text-blue-400">
                          {performance.totalBets.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {/* Placeholder for chart */}
                    <div className="bg-gray-700 rounded-lg p-4 h-32 flex items-center justify-center">
                      <span className="text-gray-400">📊 Monthly ROI Chart (Coming Soon)</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                )}
              </div>

              {/* Autonomous Engine Status */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">🤖 Autonomous Engine</h3>
                {autonomousStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${autonomousStatus.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`font-semibold ${autonomousStatus.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {autonomousStatus.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Bets</span>
                      <span className="text-white font-semibold">{autonomousStatus.activeBetsCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Managed</span>
                      <span className="text-white font-semibold">{formatCurrency(autonomousStatus.totalManagedAmount)}</span>
                    </div>
                    <div className="space-y-3 pt-4">
                      <button
                        onClick={handleToggleAutonomous}
                        disabled={toggleAutonomousMutation.isPending}
                        className={`w-full font-semibold py-3 px-4 rounded-lg transition-colors ${
                          autonomousStatus.isActive
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                      >
                        {toggleAutonomousMutation.isPending
                          ? 'Updating...'
                          : autonomousStatus.isActive
                          ? 'Pause Engine'
                          : 'Activate Engine'
                        }
                      </button>
                      <button
                        onClick={handleKillSwitch}
                        disabled={killSwitchMutation.isPending || !autonomousStatus.isActive}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        {killSwitchMutation.isPending ? 'Activating...' : '🚨 Emergency Kill Switch'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">📋 Transaction History</h3>
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-medium py-3 px-2">Date</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-2">Type</th>
                        <th className="text-right text-gray-400 font-medium py-3 px-2">Amount</th>
                        <th className="text-right text-gray-400 font-medium py-3 px-2 hidden sm:table-cell">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-700/50">
                          <td className="py-3 px-2 text-white">
                            <div className="text-sm">
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(transaction.date), 'h:mm a')}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                              <span className="text-white capitalize">{transaction.type.replace('-', ' ')}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={`font-semibold ${
                              transaction.type === 'deposit' || transaction.type === 'bet-win'
                                ? 'text-green-400'
                                : transaction.type === 'withdrawal' || transaction.type === 'bet-loss' || transaction.type === 'fee'
                                ? 'text-red-400'
                                : 'text-white'
                            }`}>
                              {transaction.type === 'deposit' || transaction.type === 'bet-win' ? '+' : '-'}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-400 font-medium hidden sm:table-cell">
                            {formatCurrency(transaction.balanceAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h4 className="text-xl font-semibold text-white mb-2">No transactions yet</h4>
                  <p className="text-gray-400">Make your first deposit to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}