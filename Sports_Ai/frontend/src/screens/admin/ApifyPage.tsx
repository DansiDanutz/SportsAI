import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import {
  apifyApi,
  ApifyOddsResult,
  ApifyPrediction,
  ApifyStatus,
  ApifyLeaguesResponse,
  ApifyRunStatus,
} from '../../services/api';

export function ApifyPage() {
  const [status, setStatus] = useState<ApifyStatus | null>(null);
  const [leagues, setLeagues] = useState<ApifyLeaguesResponse | null>(null);
  const [selectedLeague, setSelectedLeague] = useState('NBA');
  const [odds, setOdds] = useState<ApifyOddsResult[]>([]);
  const [predictions, setPredictions] = useState<ApifyPrediction[]>([]);
  const [runHistory, setRunHistory] = useState<ApifyRunStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'odds' | 'predictions' | 'history'>('odds');
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'apify' | 'mock'>('mock');

  // Load initial data
  useEffect(() => {
    loadStatus();
    loadLeagues();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await apifyApi.getStatus();
      setStatus(statusData);
    } catch {
      setError('Failed to load Apify status');
    }
  };

  const loadLeagues = async () => {
    try {
      const leaguesData = await apifyApi.getLeagues();
      setLeagues(leaguesData);
    } catch {
      setError('Failed to load available leagues');
    }
  };

  const fetchOdds = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apifyApi.fetchOdds({ league: selectedLeague });
      setOdds(response.data);
      setLastFetched(response.fetchedAt);
      setDataSource(response.source);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch odds');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apifyApi.fetchPredictions();
      setPredictions(response.data);
      setLastFetched(response.fetchedAt);
      setDataSource(response.source);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  const loadRunHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apifyApi.getRunHistory();
      setRunHistory(response.runs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load run history');
    } finally {
      setLoading(false);
    }
  };

  const syncOddsToDatabase = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await apifyApi.syncOdds(selectedLeague);
      alert(`Sync completed!\nFetched: ${response.fetched}\nCreated: ${response.created}\nUpdated: ${response.updated}\nErrors: ${response.errors}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync odds');
    } finally {
      setSyncing(false);
    }
  };

  const formatOdds = (odds: number | undefined) => {
    if (!odds) return '-';
    return odds > 0 ? `+${odds.toFixed(2)}` : odds.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Apify Integration</h1>
                <p className="text-gray-400">Real-time odds scraping and data management</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Integration Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Connection Status</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${status?.configured ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className={status?.configured ? 'text-green-400' : 'text-yellow-400'}>
                    {status?.configured ? 'Connected' : 'Using Mock Data'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">API Token</div>
                <div className="text-white font-mono text-sm">{status?.apiToken || 'Not set'}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Available Actors</div>
                <div className="text-white">{status?.availableActors?.length || 0} actors</div>
              </div>
            </div>

            {!status?.configured && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-yellow-400 text-sm">
                    Set APIFY_API_TOKEN in your .env file to enable live data scraping.
                    Get your token at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="underline">Apify Console</a>.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6">
            {(['odds', 'predictions', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'history') loadRunHistory();
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}

          {/* Odds Tab */}
          {activeTab === 'odds' && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Live Odds Scraper</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {leagues?.leagues.map((league) => (
                      <option key={league.key} value={league.key}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={fetchOdds}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                        </svg>
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Fetch Odds</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={syncOddsToDatabase}
                    disabled={syncing || odds.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {syncing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                        </svg>
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Sync to DB</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {lastFetched && (
                <div className="mb-4 text-sm text-gray-400">
                  Last fetched: {formatDate(lastFetched)} • Source: <span className={dataSource === 'apify' ? 'text-green-400' : 'text-yellow-400'}>{dataSource}</span>
                </div>
              )}

              {odds.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Matchup</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Bookmaker</th>
                        <th className="pb-3 font-medium text-center">Moneyline</th>
                        <th className="pb-3 font-medium text-center">Spread</th>
                        <th className="pb-3 font-medium text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {odds.map((odd, index) => (
                        <tr key={index} className="text-white">
                          <td className="py-4">
                            <div className="font-medium">{odd.team1}</div>
                            <div className="text-gray-400">{odd.team2}</div>
                          </td>
                          <td className="py-4 text-gray-300">
                            {formatDate(odd.gameTime)}
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-gray-700 rounded text-sm">
                              {odd.bookmaker}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            {odd.moneyline && (
                              <div>
                                <div className="text-green-400">{formatOdds(odd.moneyline.team1)}</div>
                                <div className="text-red-400">{formatOdds(odd.moneyline.team2)}</div>
                                {odd.moneyline.draw && (
                                  <div className="text-gray-400">{formatOdds(odd.moneyline.draw)}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            {odd.spread && (
                              <div>
                                <div>{odd.spread.team1 > 0 ? '+' : ''}{odd.spread.team1} ({formatOdds(odd.spread.team1Odds)})</div>
                                <div>{odd.spread.team2 > 0 ? '+' : ''}{odd.spread.team2} ({formatOdds(odd.spread.team2Odds)})</div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            {odd.total && (
                              <div>
                                <div>O {odd.total.over} ({formatOdds(odd.total.overOdds)})</div>
                                <div>U {odd.total.under} ({formatOdds(odd.total.underOdds)})</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No odds data yet. Click "Fetch Odds" to load data.</p>
                </div>
              )}
            </div>
          )}

          {/* Predictions Tab */}
          {activeTab === 'predictions' && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Aggregated Predictions</h2>
                <button
                  onClick={fetchPredictions}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Fetch Predictions</span>
                    </>
                  )}
                </button>
              </div>

              {lastFetched && (
                <div className="mb-4 text-sm text-gray-400">
                  Last fetched: {formatDate(lastFetched)} • Source: <span className={dataSource === 'apify' ? 'text-green-400' : 'text-yellow-400'}>{dataSource}</span>
                </div>
              )}

              {predictions.length > 0 ? (
                <div className="grid gap-4">
                  {predictions.map((pred, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{pred.event}</div>
                        <div className="text-orange-400">{pred.prediction}</div>
                        <div className="text-sm text-gray-400 mt-1">Source: {pred.source}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{(pred.confidence * 100).toFixed(0)}%</div>
                        <div className="text-sm text-gray-400">Confidence</div>
                        <div className="text-green-400 font-medium">@ {pred.odds.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p>No predictions yet. Click "Fetch Predictions" to load data.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Run History</h2>
                <button
                  onClick={loadRunHistory}
                  disabled={loading}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Refresh
                </button>
              </div>

              {!status?.configured ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p>Run history is only available when Apify is configured.</p>
                </div>
              ) : runHistory.length > 0 ? (
                <div className="space-y-3">
                  {runHistory.map((run) => (
                    <div key={run.actorRunId} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm text-gray-400">{run.actorRunId}</div>
                        <div className="text-white">{formatDate(run.startedAt)}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        run.status === 'SUCCEEDED' ? 'bg-green-500/20 text-green-400' :
                        run.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' :
                        run.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {run.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No run history available.</p>
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">About Apify Integration</h3>
            <div className="text-gray-300 space-y-2">
              <p>Apify provides powerful web scraping capabilities for fetching real-time sports betting data:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li><strong className="text-white">Odds API:</strong> Scrapes odds from BetMGM, Caesars, DraftKings, FanDuel, and Bet365</li>
                <li><strong className="text-white">SofaScore Scraper:</strong> Gets match stats, live scores, players, and teams data</li>
                <li><strong className="text-white">Prediction Aggregator:</strong> Collects predictions from multiple betting prediction sites</li>
              </ul>
              <p className="mt-4 text-sm">
                To enable live data scraping, set your APIFY_API_TOKEN environment variable.
                Get your token at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">console.apify.com</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
