import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useState, useEffect } from 'react';

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

interface PingResponse {
  status: string;
  latencyMs: number;
  dbLatencyMs: number;
  timestamp: string;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'ok' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function AdminPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<MetricsResponse>({
    queryKey: ['adminMetrics'],
    queryFn: () => api.get('/api/monitoring/metrics').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: ping, isLoading: pingLoading } = useQuery<PingResponse>({
    queryKey: ['adminPing'],
    queryFn: () => api.get('/api/monitoring/ping').then(r => r.data),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (metrics) setLastRefresh(new Date());
  }, [metrics]);

  const getMetric = (name: string) => metrics?.metrics?.find(m => m.name === name);

  const overallStatus = metrics?.status || 'unknown';
  const statusColor = overallStatus === 'healthy' ? 'text-green-400' : overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400';

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">System Dashboard</h1>
            </div>
            <p className="text-gray-400">Real-time platform health & metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-500">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
            <button
              onClick={() => refetchMetrics()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Top Status Bar */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <StatusDot status={overallStatus === 'healthy' ? 'ok' : overallStatus === 'degraded' ? 'warning' : 'critical'} />
            <div>
              <span className={`text-lg font-bold ${statusColor} uppercase`}>{overallStatus}</span>
              <p className="text-gray-500 text-xs">System Status</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Uptime: </span>
              <span className="text-white font-mono">{metrics ? formatUptime(metrics.uptime) : '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">API Latency: </span>
              <span className={`font-mono ${(ping?.latencyMs ?? 0) < 100 ? 'text-green-400' : (ping?.latencyMs ?? 0) < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                {ping ? `${ping.latencyMs}ms` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">DB Latency: </span>
              <span className={`font-mono ${(ping?.dbLatencyMs ?? 0) < 50 ? 'text-green-400' : (ping?.dbLatencyMs ?? 0) < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                {ping ? `${ping.dbLatencyMs}ms` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(metricsLoading || pingLoading) && !metrics && (
          <div className="text-center py-20">
            <div className="inline-flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-gray-400">Loading system metrics...</span>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.metrics.map((metric) => (
              <div
                key={metric.name}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm font-medium truncate">{metric.name}</span>
                  <StatusDot status={metric.status} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </div>
                {metric.detail && (
                  <p className="text-xs text-gray-500 truncate">{metric.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Apify Integration */}
          <Link to="/admin/apify" className="block bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition-colors group">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-colors">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">Apify Integration</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">Real-time odds scraping and data management</p>
            <span className="text-orange-400 text-sm font-medium flex items-center space-x-1">
              <span>Configure →</span>
            </span>
          </Link>

          {/* User Management */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Users</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Users</span>
                <span className="text-white font-mono">{getMetric('Total Users')?.value ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active (24h)</span>
                <span className="text-white font-mono">{getMetric('Active Users (24h)')?.value ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Data Health */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Data Health</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Events</span>
                <span className="text-white font-mono">{getMetric('Total Events')?.value ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Odds Quotes (1h)</span>
                <span className="text-white font-mono">{getMetric('Odds Quotes (1h)')?.value ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Notice */}
        <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-400 text-sm">
              Admin-only area. All actions are logged for security purposes.
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
