import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

interface AiSettings {
  sportScope: string[];
  confidenceThreshold: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  variableWeights: {
    recentForm: number;
    headToHead: number;
    homeAdvantage: number;
    injuries: number;
    marketMovement: number;
  };
  excludedMarkets: string[];
}

interface AiTip {
  id: string;
  type: string;
  sport: string;
  sportKey: string;
  confidence: number;
  insight: string;
  game: string;
  pick: string;
  expectedRoi: number;
  relatedEvents: string[];
  createdAt: string;
}

interface TipsResponse {
  tips: AiTip[];
  total: number;
  appliedSettings: {
    sportScope: string[];
    confidenceThreshold: number;
    riskProfile: string;
  };
}

const SPORTS = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'baseball', name: 'Baseball', icon: '⚾' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
];

export function AiInsightsPage() {
  const [activeTab, setActiveTab] = useState<'tips' | 'settings'>('tips');
  const [localSettings, setLocalSettings] = useState<AiSettings | null>(null);
  const queryClient = useQueryClient();

  // Fetch AI settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const response = await api.get<AiSettings>('/v1/ai/settings');
      return response.data;
    },
  });

  // Fetch AI tips
  const { data: tipsData, isLoading: tipsLoading } = useQuery({
    queryKey: ['ai-tips'],
    queryFn: async () => {
      const response = await api.get<TipsResponse>('/v1/ai/tips');
      return response.data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<AiSettings>) => {
      const response = await api.patch('/v1/ai/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-tips'] });
    },
  });

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const handleSportToggle = (sportKey: string) => {
    if (!localSettings) return;
    const currentScope = localSettings.sportScope;
    const newScope = currentScope.includes(sportKey)
      ? currentScope.filter((s) => s !== sportKey)
      : [...currentScope, sportKey];
    setLocalSettings({ ...localSettings, sportScope: newScope });
  };

  const handleConfidenceChange = (value: number) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, confidenceThreshold: value });
  };

  const handleRiskProfileChange = (profile: 'conservative' | 'balanced' | 'aggressive') => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, riskProfile: profile });
  };

  const handleWeightChange = (key: keyof AiSettings['variableWeights'], value: number) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      variableWeights: { ...localSettings.variableWeights, [key]: value },
    });
  };

  const handleSaveSettings = () => {
    if (!localSettings) return;
    updateSettingsMutation.mutate(localSettings);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'arbitrage':
        return '🎯';
      case 'value_bet':
        return '💰';
      case 'market_trend':
        return '📈';
      default:
        return '🔮';
    }
  };

  const getSportIcon = (sportKey: string) => {
    const sport = SPORTS.find((s) => s.key === sportKey);
    return sport?.icon || '🏆';
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">AI Insights</h1>
            <p className="text-gray-400 mt-2">AI-powered betting tips and predictions</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              AI Tips
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              data-testid="ai-settings-tab"
            >
              Settings
            </button>
          </div>

          {activeTab === 'tips' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tips List */}
              <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Today's AI Tips</h2>
                {tipsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : tipsData && tipsData.tips.length > 0 ? (
                  <div className="space-y-4">
                    {tipsData.tips.map((tip) => (
                      <div key={tip.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getTypeIcon(tip.type)}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getSportIcon(tip.sportKey)}</span>
                                <span className="text-white font-medium">{tip.game}</span>
                              </div>
                              <div className="text-green-400 text-sm">{tip.pick}</div>
                            </div>
                          </div>
                          <span className="text-green-400 font-semibold">+{tip.expectedRoi}% ROI</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{tip.insight}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Confidence:</span>
                          <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                tip.confidence >= 85
                                  ? 'bg-green-500'
                                  : tip.confidence >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ width: `${tip.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-white">{tip.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-4">🔍</div>
                    <p>No tips match your current settings. Try adjusting your filters.</p>
                  </div>
                )}
              </div>

              {/* AI Performance */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-2">Performance</h2>
                <p className="text-sm text-gray-400">
                  Not available yet. We’ll only display performance once we store verified bet results (no mock metrics).
                </p>
              </div>

              {/* Applied Settings Summary */}
              {tipsData?.appliedSettings && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Applied Filters</h2>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Sports:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {tipsData.appliedSettings.sportScope.map((sport) => (
                          <span
                            key={sport}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm"
                          >
                            {getSportIcon(sport)} {sport}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Min Confidence:</span>
                      <span className="ml-2 text-white">{tipsData.appliedSettings.confidenceThreshold}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Risk Profile:</span>
                      <span className="ml-2 text-white capitalize">{tipsData.appliedSettings.riskProfile}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              {settingsLoading || !localSettings ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sport Scope */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Sport Scope</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Select which sports to include in AI recommendations
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {SPORTS.map((sport) => (
                        <button
                          key={sport.key}
                          onClick={() => handleSportToggle(sport.key)}
                          className={`p-3 rounded-lg border transition-colors ${
                            localSettings.sportScope.includes(sport.key)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                          }`}
                          data-testid={`sport-toggle-${sport.key}`}
                        >
                          <span className="text-xl">{sport.icon}</span>
                          <span className="ml-2">{sport.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Confidence Threshold</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Only show tips with confidence above this level
                    </p>
                    <div className="space-y-4">
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={localSettings.confidenceThreshold}
                        onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        data-testid="confidence-slider"
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">50%</span>
                        <span className="text-white font-medium">{localSettings.confidenceThreshold}%</span>
                        <span className="text-gray-400">95%</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Profile */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Risk Profile</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Determines how tips are ranked and presented
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['conservative', 'balanced', 'aggressive'] as const).map((profile) => (
                        <button
                          key={profile}
                          onClick={() => handleRiskProfileChange(profile)}
                          className={`p-3 rounded-lg border transition-colors ${
                            localSettings.riskProfile === profile
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                          }`}
                          data-testid={`risk-profile-${profile}`}
                        >
                          <div className="text-lg mb-1">
                            {profile === 'conservative' ? '🛡️' : profile === 'balanced' ? '⚖️' : '🚀'}
                          </div>
                          <div className="text-sm capitalize">{profile}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs mt-3">
                      {localSettings.riskProfile === 'conservative' &&
                        'Prioritizes high-confidence picks with lower expected returns'}
                      {localSettings.riskProfile === 'balanced' &&
                        'Balances confidence and expected returns'}
                      {localSettings.riskProfile === 'aggressive' &&
                        'Prioritizes higher expected returns over confidence'}
                    </p>
                  </div>

                  {/* Variable Weights */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Variable Weights</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Adjust how much each factor influences recommendations
                    </p>
                    <div className="space-y-4">
                      {Object.entries(localSettings.variableWeights).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-white">{value}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={value}
                            onChange={(e) =>
                              handleWeightChange(
                                key as keyof AiSettings['variableWeights'],
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            data-testid={`weight-slider-${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
                      data-testid="save-settings-button"
                    >
                      {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>

                  {updateSettingsMutation.isSuccess && (
                    <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-center">
                      Settings saved successfully! Tips will update to reflect your preferences.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
