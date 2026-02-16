import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

interface SystemMetric {
  name: string;
  value: number | string;
  status: 'ok' | 'warning' | 'critical';
  detail?: string;
}

interface MetricsResponse {
  status: string;
  timestamp: string;
  metrics: SystemMetric[];
  uptime: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  ok: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', border: 'border-green-500/20' },
  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400', border: 'border-yellow-500/20' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', border: 'border-red-500/20' },
};

const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
  total_users: { label: 'Total Users', icon: '👥' },
  active_users_24h: { label: 'Active Users (24h)', icon: '🟢' },
  total_events: { label: 'Total Events', icon: '⚽' },
  odds_quotes_1h: { label: 'Odds Updates (1h)', icon: '📊' },
  odds_quotes_24h: { label: 'Odds Updates (24h)', icon: '📈' },
  total_alert_rules: { label: 'Alert Rules', icon: '🔔' },
  total_arbitrage_opportunities: { label: 'Arbitrage Opportunities', icon: '💰' },
  recent_insights_feedback: { label: 'AI Feedback (24h)', icon: '🧠' },
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function OverallStatus({ status }: { status: string }) {
  const config = status === 'healthy'
    ? { color: 'from-green-500 to-emerald-600', label: 'All Systems Operational', icon: '✅' }
    : status === 'degraded'
    ? { color: 'from-yellow-500 to-amber-600', label: 'Partial Degradation', icon: '⚠️' }
    : { color: 'from-red-500 to-rose-600', label: 'System Issues Detected', icon: '🔴' };

  return (
    <div className={`bg-gradient-to-r ${config.color} rounded-2xl p-6 shadow-lg`}>
      <div className="flex items-center space-x-4">
        <span className="text-4xl">{config.icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{config.label}</h2>
          <p className="text-white/80 text-sm">Real-time system monitoring</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: SystemMetric }) {
  const colors = STATUS_COLORS[metric.status] || STATUS_COLORS.ok;
  const meta = METRIC_LABELS[metric.name] || { label: metric.name.replace(/_/g, ' '), icon: '📋' };

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-sm font-medium text-gray-300">{meta.label}</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
      </div>
      <p className={`text-2xl font-bold ${colors.text}`}>
        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
      </p>
      {metric.detail && (
        <p className="text-xs text-gray-500 mt-1">{metric.detail}</p>
      )}
    </div>
  );
}

export function StatusPage() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<MetricsResponse>({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const res = await api.get('/api/monitoring/metrics');
      return res.data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-5xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">System Status</h1>
              <p className="text-gray-400 text-sm">Live platform health & metrics</p>
            </div>
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium">Failed to load system metrics</p>
            <p className="text-gray-500 text-sm mt-1">The monitoring endpoint may be unavailable</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <OverallStatus status={data.status} />

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Uptime: <span className="text-gray-300 font-medium">{formatUptime(data.uptime)}</span></span>
              <span>Last updated: <span className="text-gray-300">{new Date(dataUpdatedAt).toLocaleTimeString()}</span></span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.metrics.map((metric) => (
                <MetricCard key={metric.name} metric={metric} />
              ))}
            </div>

            {/* Refresh info */}
            <p className="text-center text-xs text-gray-600">Auto-refreshes every 30 seconds</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
