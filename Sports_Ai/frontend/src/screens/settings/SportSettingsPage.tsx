import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

// Sport-specific configuration options
const sportConfigs: Record<string, {
  name: string;
  icon: string;
  marketGroups: Array<{ id: string; name: string; description: string }>;
  periodPreferences: Array<{ id: string; name: string }>;
}> = {
  soccer: {
    name: 'Soccer',
    icon: '⚽',
    marketGroups: [
      { id: 'match_result', name: 'Match Result (1X2)', description: 'Home win, draw, or away win' },
      { id: 'over_under', name: 'Over/Under Goals', description: 'Total goals scored' },
      { id: 'btts', name: 'Both Teams To Score', description: 'Both teams score or not' },
      { id: 'asian_handicap', name: 'Asian Handicap', description: 'Handicap betting with half goals' },
      { id: 'correct_score', name: 'Correct Score', description: 'Exact final score' },
      { id: 'first_goalscorer', name: 'First Goalscorer', description: 'First player to score' },
    ],
    periodPreferences: [
      { id: 'full_time', name: 'Full Time (90 min)' },
      { id: 'first_half', name: 'First Half' },
      { id: 'second_half', name: 'Second Half' },
      { id: 'halftime_fulltime', name: 'Halftime/Fulltime' },
    ],
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    marketGroups: [
      { id: 'moneyline', name: 'Moneyline', description: 'Straight win betting' },
      { id: 'spread', name: 'Point Spread', description: 'Handicap betting with points' },
      { id: 'total_points', name: 'Total Points', description: 'Over/Under total points' },
      { id: 'player_props', name: 'Player Props', description: 'Individual player performance' },
      { id: 'quarter_betting', name: 'Quarter Betting', description: 'Bet on specific quarters' },
    ],
    periodPreferences: [
      { id: 'full_game', name: 'Full Game' },
      { id: 'first_quarter', name: '1st Quarter' },
      { id: 'first_half', name: 'First Half' },
      { id: 'second_half', name: 'Second Half' },
    ],
  },
  tennis: {
    name: 'Tennis',
    icon: '🎾',
    marketGroups: [
      { id: 'match_winner', name: 'Match Winner', description: 'Who wins the match' },
      { id: 'set_betting', name: 'Set Betting', description: 'Correct score in sets' },
      { id: 'total_games', name: 'Total Games', description: 'Over/Under total games' },
      { id: 'handicap_games', name: 'Game Handicap', description: 'Handicap in games' },
      { id: 'first_set_winner', name: 'First Set Winner', description: 'Who wins the first set' },
    ],
    periodPreferences: [
      { id: 'match', name: 'Full Match' },
      { id: 'first_set', name: 'First Set' },
      { id: 'second_set', name: 'Second Set' },
    ],
  },
  'american_football': {
    name: 'American Football',
    icon: '🏈',
    marketGroups: [
      { id: 'moneyline', name: 'Moneyline', description: 'Straight win betting' },
      { id: 'spread', name: 'Point Spread', description: 'Handicap betting' },
      { id: 'total_points', name: 'Total Points', description: 'Over/Under total points' },
      { id: 'player_props', name: 'Player Props', description: 'Individual player performance' },
      { id: 'team_totals', name: 'Team Totals', description: 'Individual team scoring' },
    ],
    periodPreferences: [
      { id: 'full_game', name: 'Full Game' },
      { id: 'first_half', name: 'First Half' },
      { id: 'first_quarter', name: '1st Quarter' },
    ],
  },
  ice_hockey: {
    name: 'Ice Hockey',
    icon: '🏒',
    marketGroups: [
      { id: 'moneyline', name: 'Moneyline', description: 'Straight win betting (including OT)' },
      { id: 'puck_line', name: 'Puck Line', description: '+/- 1.5 goals handicap' },
      { id: 'total_goals', name: 'Total Goals', description: 'Over/Under total goals' },
      { id: 'period_betting', name: 'Period Betting', description: 'Bet on specific periods' },
    ],
    periodPreferences: [
      { id: 'full_game', name: 'Full Game (inc. OT)' },
      { id: 'regulation', name: 'Regulation Only' },
      { id: 'first_period', name: '1st Period' },
    ],
  },
};

interface SportSettings {
  sportId: string;
  enabledMarkets: string[];
  preferredPeriod: string;
  showLiveOnly: boolean;
  minOdds: number;
  maxOdds: number;
  defaultStake: number;
}

export function SportSettingsPage() {
  const { sportKey } = useParams<{ sportKey: string }>();
  const navigate = useNavigate();
  const sportConfig = sportKey ? sportConfigs[sportKey] : null;

  const [settings, setSettings] = useState<SportSettings>({
    sportId: sportKey || '',
    enabledMarkets: [],
    preferredPeriod: '',
    showLiveOnly: false,
    minOdds: 1.01,
    maxOdds: 100,
    defaultStake: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!sportKey) return;
      try {
        const response = await api.get(`/v1/users/me/settings/sports/${sportKey}`);
        if (response.data.settings) {
          setSettings(response.data.settings);
        } else {
          // Default settings if none exist
          setSettings({
            sportId: sportKey,
            enabledMarkets: sportConfig?.marketGroups.map(m => m.id) || [],
            preferredPeriod: sportConfig?.periodPreferences[0]?.id || '',
            showLiveOnly: false,
            minOdds: 1.01,
            maxOdds: 100,
            defaultStake: 10,
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Use defaults on error
        setSettings({
          sportId: sportKey,
          enabledMarkets: sportConfig?.marketGroups.map(m => m.id) || [],
          preferredPeriod: sportConfig?.periodPreferences[0]?.id || '',
          showLiveOnly: false,
          minOdds: 1.01,
          maxOdds: 100,
          defaultStake: 10,
        });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [sportKey, sportConfig]);

  const handleToggleMarket = (marketId: string) => {
    setSettings(prev => ({
      ...prev,
      enabledMarkets: prev.enabledMarkets.includes(marketId)
        ? prev.enabledMarkets.filter(m => m !== marketId)
        : [...prev.enabledMarkets, marketId],
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/v1/users/me/settings/sports/${sportKey}`, settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!sportConfig) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl text-white mb-4">Sport not found</h1>
          <p className="text-gray-400 mb-6">The sport settings you're looking for don't exist.</p>
          <Link
            to="/settings"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Back to Settings
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link to="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
            </li>
            <li className="text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium flex items-center gap-2">
              <span>{sportConfig.icon}</span>
              {sportConfig.name} Settings
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center text-4xl border border-gray-700">
              {sportConfig.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{sportConfig.name} Settings</h1>
              <p className="text-gray-400 mt-1">
                Configure markets and preferences for {sportConfig.name} events
              </p>
            </div>
          </div>

          {/* Sport Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm mr-2">Switch Sport:</span>
            {Object.entries(sportConfigs).map(([key, config]) => (
              <button
                key={key}
                onClick={() => navigate(`/settings/sports/${key}`)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors ${
                  key === sportKey
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}
                title={config.name}
              >
                {config.icon}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            {/* Market Groups */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Market Groups</h2>
              <p className="text-gray-400 text-sm mb-4">
                Select which market types to show for {sportConfig.name} events
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sportConfig.marketGroups.map((market) => (
                  <label
                    key={market.id}
                    className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                      settings.enabledMarkets.includes(market.id)
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.enabledMarkets.includes(market.id)}
                      onChange={() => handleToggleMarket(market.id)}
                      className="mt-1 w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
                    />
                    <div className="ml-3">
                      <div className="text-white font-medium">{market.name}</div>
                      <div className="text-gray-400 text-sm">{market.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Period Preferences */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Period Preferences</h2>
              <p className="text-gray-400 text-sm mb-4">
                Select your preferred betting period for {sportConfig.name}
              </p>
              <div className="flex flex-wrap gap-3">
                {sportConfig.periodPreferences.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSettings(prev => ({ ...prev, preferredPeriod: period.id }))}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      settings.preferredPeriod === period.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {period.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Odds Range */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Odds Range</h2>
              <p className="text-gray-400 text-sm mb-4">
                Set the default odds range filter for {sportConfig.name} events
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Min Odds</label>
                  <input
                    type="number"
                    value={settings.minOdds}
                    onChange={(e) => setSettings(prev => ({ ...prev, minOdds: parseFloat(e.target.value) || 1.01 }))}
                    min="1.01"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Max Odds</label>
                  <input
                    type="number"
                    value={settings.maxOdds}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxOdds: parseFloat(e.target.value) || 100 }))}
                    min="1.01"
                    max="1000"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Default Stake */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Default Stake</h2>
              <p className="text-gray-400 text-sm mb-4">
                Set your default stake amount for bet calculations
              </p>
              <div className="max-w-xs">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={settings.defaultStake}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultStake: parseFloat(e.target.value) || 10 }))}
                    min="1"
                    step="1"
                    className="w-full px-4 py-3 pl-8 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Display Options</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-white">Show Live Events Only</div>
                    <div className="text-sm text-gray-400">
                      Only display live in-play events by default
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showLiveOnly}
                    onChange={(e) => setSettings(prev => ({ ...prev, showLiveOnly: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
                  />
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
              <div>
                {saveSuccess && (
                  <div className="flex items-center text-green-500">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Settings saved successfully!
                  </div>
                )}
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
