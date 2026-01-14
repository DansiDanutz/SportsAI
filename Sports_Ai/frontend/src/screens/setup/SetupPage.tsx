import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { api } from '../../services/api';

interface AiConfiguration {
  id: string;
  name: string;
  sportKey: string;
  leagues: string[];
  countries: string[];
  markets: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AiMatchInsight {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  sport: string;
  winProbability: number;
  recommendedPick: string;
  confidence: number;
  historicalStats: {
    homeWinRate: number;
    awayWinRate: number;
    drawRate: number;
    avgGoals: number;
  };
  odds: {
    home: number;
    draw?: number;
    away: number;
  };
}

interface Market {
  key: string;
  name: string;
}

interface League {
  id: string;
  name: string;
  country: string | null;
  tier: number;
}

const SPORTS = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'baseball', name: 'Baseball', icon: '⚾' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
  { key: 'cricket', name: 'Cricket', icon: '🏏' },
  { key: 'rugby', name: 'Rugby', icon: '🏉' },
  { key: 'mma', name: 'MMA', icon: '🥊' },
  { key: 'esports', name: 'eSports', icon: '🎮' },
];

export function SetupPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'configurations' | 'insights'>('configurations');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<AiConfiguration | null>(null);
  const [configToDelete, setConfigToDelete] = useState<AiConfiguration | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSport, setFormSport] = useState('soccer');
  const [formLeagues, setFormLeagues] = useState<string[]>([]);
  const [formCountries, setFormCountries] = useState<string[]>([]);
  const [formMarkets, setFormMarkets] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch configurations
  const { data: configurationsData, isLoading: configsLoading } = useQuery({
    queryKey: ['ai-configurations'],
    queryFn: async () => {
      const response = await api.get<{ configurations: AiConfiguration[] }>('/v1/setup/configurations');
      return response.data.configurations;
    },
  });

  // Fetch AI insights (only when there's an active config)
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-setup-insights'],
    queryFn: async () => {
      const response = await api.get<{ insights: AiMatchInsight[] }>('/v1/setup/ai-insights');
      return response.data.insights;
    },
    enabled: activeTab === 'insights',
  });

  // Fetch leagues for selected sport
  const { data: leaguesData } = useQuery({
    queryKey: ['setup-leagues', formSport],
    queryFn: async () => {
      const response = await api.get<{ leagues: League[] }>(`/v1/setup/leagues?sport=${formSport}`);
      return response.data.leagues;
    },
    enabled: showCreateModal || showEditModal,
  });

  // Fetch countries for selected sport
  const { data: countriesData } = useQuery({
    queryKey: ['setup-countries', formSport],
    queryFn: async () => {
      const response = await api.get<{ countries: string[] }>(`/v1/setup/countries?sport=${formSport}`);
      return response.data.countries;
    },
    enabled: showCreateModal || showEditModal,
  });

  // Fetch markets for selected sport
  const { data: marketsData } = useQuery({
    queryKey: ['setup-markets', formSport],
    queryFn: async () => {
      const response = await api.get<{ markets: Market[] }>(`/v1/setup/markets?sport=${formSport}`);
      return response.data.markets;
    },
    enabled: showCreateModal || showEditModal,
  });

  // Create configuration mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      sportKey: string;
      leagues: string[];
      countries: string[];
      markets: string[];
      isActive: boolean;
    }) => {
      const response = await api.post('/v1/setup/configurations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-setup-insights'] });
      setShowCreateModal(false);
      resetForm();
      showSuccess('Configuration created successfully!');
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Failed to create configuration');
    },
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AiConfiguration> }) => {
      const response = await api.put(`/v1/setup/configurations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-setup-insights'] });
      setShowEditModal(false);
      setConfigToEdit(null);
      resetForm();
      showSuccess('Configuration updated successfully!');
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Failed to update configuration');
    },
  });

  // Delete configuration mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/v1/setup/configurations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-setup-insights'] });
      setShowDeleteDialog(false);
      setConfigToDelete(null);
      showSuccess('Configuration deleted successfully!');
    },
  });

  // Activate configuration mutation
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/v1/setup/configurations/${id}/activate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-setup-insights'] });
      showSuccess('Configuration activated!');
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormSport('soccer');
    setFormLeagues([]);
    setFormCountries([]);
    setFormMarkets([]);
    setFormError('');
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const openEditModal = (config: AiConfiguration) => {
    setConfigToEdit(config);
    setFormName(config.name);
    setFormSport(config.sportKey);
    setFormLeagues(config.leagues);
    setFormCountries(config.countries);
    setFormMarkets(config.markets);
    setFormError('');
    setShowEditModal(true);
  };

  const handleCreate = () => {
    if (formName.trim().length < 3) {
      setFormError('Name must be at least 3 characters');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      sportKey: formSport,
      leagues: formLeagues,
      countries: formCountries,
      markets: formMarkets,
      isActive: (configurationsData?.length || 0) === 0, // Auto-activate if first config
    });
  };

  const handleUpdate = () => {
    if (!configToEdit) return;
    if (formName.trim().length < 3) {
      setFormError('Name must be at least 3 characters');
      return;
    }
    updateMutation.mutate({
      id: configToEdit.id,
      data: {
        name: formName.trim(),
        sportKey: formSport,
        leagues: formLeagues,
        countries: formCountries,
        markets: formMarkets,
      },
    });
  };

  const getSportIcon = (sportKey: string) => {
    const sport = SPORTS.find((s) => s.key === sportKey);
    return sport?.icon || '🏆';
  };

  const getSportName = (sportKey: string) => {
    const sport = SPORTS.find((s) => s.key === sportKey);
    return sport?.name || sportKey;
  };

  const activeConfig = configurationsData?.find((c) => c.isActive);

  // Reset form selections when sport changes
  useEffect(() => {
    if (showCreateModal && !configToEdit) {
      setFormLeagues([]);
      setFormCountries([]);
      setFormMarkets([]);
    }
  }, [formSport, showCreateModal, configToEdit]);

  return (
    <Layout>
      {/* Success Toast */}
      {successMessage && (
        <div
          className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-green-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">AI Setup</h1>
            <p className="text-gray-400 mt-2">
              Configure your AI filters to get personalized match insights and predictions
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('configurations')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'configurations'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Configurations
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              AI Insights
            </button>
          </div>

          {activeTab === 'configurations' && (
            <div>
              {/* Create Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  + Create Configuration
                </button>
              </div>

              {/* Configurations List */}
              {configsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : configurationsData && configurationsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {configurationsData.map((config) => (
                    <div
                      key={config.id}
                      className={`bg-gray-800 rounded-xl border p-6 transition-colors ${
                        config.isActive
                          ? 'border-green-500 ring-2 ring-green-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                            {getSportIcon(config.sportKey)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                            <p className="text-gray-400 text-sm">{getSportName(config.sportKey)}</p>
                          </div>
                        </div>
                        {config.isActive && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Config Details */}
                      <div className="space-y-2 mb-4">
                        {config.countries.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-gray-500 text-xs">Countries:</span>
                            {config.countries.slice(0, 3).map((country) => (
                              <span key={country} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                {country}
                              </span>
                            ))}
                            {config.countries.length > 3 && (
                              <span className="text-gray-500 text-xs">+{config.countries.length - 3} more</span>
                            )}
                          </div>
                        )}
                        {config.leagues.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-gray-500 text-xs">Leagues:</span>
                            {config.leagues.slice(0, 2).map((league) => (
                              <span key={league} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                {league}
                              </span>
                            ))}
                            {config.leagues.length > 2 && (
                              <span className="text-gray-500 text-xs">+{config.leagues.length - 2} more</span>
                            )}
                          </div>
                        )}
                        {config.markets.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-gray-500 text-xs">Markets:</span>
                            {config.markets.slice(0, 2).map((market) => (
                              <span key={market} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                {market}
                              </span>
                            ))}
                            {config.markets.length > 2 && (
                              <span className="text-gray-500 text-xs">+{config.markets.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!config.isActive && (
                          <button
                            onClick={() => activateMutation.mutate(config.id)}
                            disabled={activateMutation.isPending}
                            className="flex-1 px-3 py-2 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(config)}
                          className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setConfigToDelete(config);
                            setShowDeleteDialog(true);
                          }}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                  <div className="text-6xl mb-4">⚙️</div>
                  <h3 className="text-xl text-white mb-2">No Configurations Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first AI configuration to get personalized match insights based on your preferences.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setShowCreateModal(true);
                    }}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Create Your First Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              {!activeConfig ? (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                  <div className="text-6xl mb-4">🔮</div>
                  <h3 className="text-xl text-white mb-2">No Active Configuration</h3>
                  <p className="text-gray-400 mb-6">
                    Activate a configuration to see AI-powered match insights.
                  </p>
                  <button
                    onClick={() => setActiveTab('configurations')}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Go to Configurations
                  </button>
                </div>
              ) : (
                <div>
                  {/* Active Config Summary */}
                  <div className="bg-gray-800 rounded-xl border border-green-500/50 p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getSportIcon(activeConfig.sportKey)}</span>
                        <div>
                          <span className="text-white font-medium">{activeConfig.name}</span>
                          <span className="text-gray-400 text-sm ml-2">
                            {activeConfig.countries.length > 0 && `${activeConfig.countries.join(', ')} • `}
                            {activeConfig.markets.length > 0 && activeConfig.markets.join(', ')}
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
                        Active Filter
                      </span>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Top 5 Daily Matches
                  </h2>

                  {insightsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : insightsData && insightsData.length > 0 ? (
                    <div className="space-y-4">
                      {insightsData.map((insight, index) => (
                        <div
                          key={insight.eventId}
                          className="bg-gray-800 rounded-xl border border-gray-700 p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                                #{index + 1}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">
                                  {insight.homeTeam} vs {insight.awayTeam}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                  {insight.league} • {new Date(insight.startTime).toLocaleDateString()} {new Date(insight.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-400">{insight.winProbability}%</div>
                              <div className="text-gray-400 text-sm">Win Probability</div>
                            </div>
                          </div>

                          {/* Recommended Pick */}
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-gray-400 text-sm">AI Recommended Pick</span>
                                <div className="text-green-400 font-semibold text-lg">{insight.recommendedPick}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">Confidence:</span>
                                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      insight.confidence >= 80
                                        ? 'bg-green-500'
                                        : insight.confidence >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${insight.confidence}%` }}
                                  />
                                </div>
                                <span className="text-white font-medium">{insight.confidence}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-gray-400 text-xs mb-1">Home Win Rate</div>
                              <div className="text-white font-semibold">{insight.historicalStats.homeWinRate}%</div>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-gray-400 text-xs mb-1">Away Win Rate</div>
                              <div className="text-white font-semibold">{insight.historicalStats.awayWinRate}%</div>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-gray-400 text-xs mb-1">Draw Rate</div>
                              <div className="text-white font-semibold">{insight.historicalStats.drawRate}%</div>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-gray-400 text-xs mb-1">Avg Goals</div>
                              <div className="text-white font-semibold">
                                {insight.historicalStats.avgGoals > 0 ? insight.historicalStats.avgGoals : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Odds */}
                          <div className="mt-4 flex items-center gap-4">
                            <span className="text-gray-400 text-sm">Best Odds:</span>
                            <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm">
                              Home: {insight.odds.home.toFixed(2)}
                            </span>
                            {insight.odds.draw && (
                              <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm">
                                Draw: {insight.odds.draw.toFixed(2)}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm">
                              Away: {insight.odds.away.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-xl text-white mb-2">No Matches Found</h3>
                      <p className="text-gray-400">
                        No matches match your current configuration filters. Try adjusting your settings.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setConfigToEdit(null);
            resetForm();
          }}
        >
          <div
            className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              {showEditModal ? 'Edit Configuration' : 'Create Configuration'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Configuration Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g., Spain La Liga Over/Under"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Sport Selection */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Sport</label>
                <div className="grid grid-cols-5 gap-2">
                  {SPORTS.map((sport) => (
                    <button
                      key={sport.key}
                      onClick={() => setFormSport(sport.key)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        formSport === sport.key
                          ? 'bg-green-500/20 border-green-500 text-white'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-xl">{sport.icon}</div>
                      <div className="text-xs mt-1">{sport.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Countries (optional)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700/50 rounded-lg">
                  {countriesData && countriesData.length > 0 ? (
                    countriesData.map((country) => (
                      <button
                        key={country}
                        onClick={() => {
                          setFormCountries((prev) =>
                            prev.includes(country)
                              ? prev.filter((c) => c !== country)
                              : [...prev, country]
                          );
                        }}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          formCountries.includes(country)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {country}
                      </button>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No countries available for this sport</span>
                  )}
                </div>
              </div>

              {/* Leagues */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Leagues (optional)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700/50 rounded-lg">
                  {leaguesData && leaguesData.length > 0 ? (
                    leaguesData.map((league) => (
                      <button
                        key={league.id}
                        onClick={() => {
                          setFormLeagues((prev) =>
                            prev.includes(league.name)
                              ? prev.filter((l) => l !== league.name)
                              : [...prev, league.name]
                          );
                        }}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          formLeagues.includes(league.name)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {league.name} {league.country && `(${league.country})`}
                      </button>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No leagues available for this sport</span>
                  )}
                </div>
              </div>

              {/* Markets */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Markets (optional)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700/50 rounded-lg">
                  {marketsData && marketsData.length > 0 ? (
                    marketsData.map((market) => (
                      <button
                        key={market.key}
                        onClick={() => {
                          setFormMarkets((prev) =>
                            prev.includes(market.key)
                              ? prev.filter((m) => m !== market.key)
                              : [...prev, market.key]
                          );
                        }}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          formMarkets.includes(market.key)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {market.name}
                      </button>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">Loading markets...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setConfigToEdit(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : showEditModal
                  ? 'Save Changes'
                  : 'Create Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setConfigToDelete(null);
        }}
        onConfirm={() => configToDelete && deleteMutation.mutate(configToDelete.id)}
        title="Delete Configuration"
        message={`Are you sure you want to delete "${configToDelete?.name}"? This action cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        confirmDisabled={deleteMutation.isPending}
        variant="danger"
      />
    </Layout>
  );
}
