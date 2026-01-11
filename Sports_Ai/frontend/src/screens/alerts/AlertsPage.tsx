import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

type AlertType = 'odds_threshold' | 'arbitrage_opportunity' | 'favorite_team_event';

interface OddsThresholdCondition {
  threshold: number;
  direction: 'below' | 'above';
  sportId?: string;
  marketKey?: string;
}

interface ArbitrageCondition {
  minProfitMargin: number;
  sportId?: string;
}

interface FavoriteTeamCondition {
  teamId: string;
  teamName: string;
}

type AlertConditions = OddsThresholdCondition | ArbitrageCondition | FavoriteTeamCondition;

interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  isActive: boolean;
  conditions: AlertConditions;
  triggeredCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

const ALERT_TYPE_INFO: Record<AlertType, { label: string; icon: string; color: string; description: string }> = {
  odds_threshold: {
    label: 'Odds Threshold',
    icon: '📊',
    color: 'blue',
    description: 'Get notified when odds go above or below a threshold',
  },
  arbitrage_opportunity: {
    label: 'Arbitrage Opportunity',
    icon: '💰',
    color: 'green',
    description: 'Get notified when arbitrage opportunities are detected',
  },
  favorite_team_event: {
    label: 'Favorite Team Event',
    icon: '⭐',
    color: 'yellow',
    description: 'Get notified when your favorite team has an upcoming event',
  },
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testingAlertId, setTestingAlertId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Create form state
  const [newAlert, setNewAlert] = useState({
    name: '',
    type: 'odds_threshold' as AlertType,
    // Odds threshold conditions
    threshold: 2.0,
    direction: 'below' as 'below' | 'above',
    // Arbitrage conditions
    minProfitMargin: 1.0,
    // Favorite team conditions
    teamId: '',
    teamName: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/v1/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name.trim()) return;

    setIsCreating(true);
    try {
      let conditions: AlertConditions;

      switch (newAlert.type) {
        case 'odds_threshold':
          conditions = {
            threshold: newAlert.threshold,
            direction: newAlert.direction,
          };
          break;
        case 'arbitrage_opportunity':
          conditions = {
            minProfitMargin: newAlert.minProfitMargin,
          };
          break;
        case 'favorite_team_event':
          conditions = {
            teamId: newAlert.teamId || `team-${newAlert.teamName.toLowerCase().replace(/\s+/g, '-')}`,
            teamName: newAlert.teamName,
          };
          break;
      }

      const response = await api.post('/v1/alerts', {
        name: newAlert.name,
        type: newAlert.type,
        conditions,
      });

      if (response.data.success) {
        setAlerts((prev) => [response.data.alert, ...prev]);
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAlert = async (id: string) => {
    try {
      const response = await api.post(`/v1/alerts/${id}/toggle`);
      if (response.data.success) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === id ? response.data.alert : alert
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.delete(`/v1/alerts/${id}`);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleTestAlert = async (id: string) => {
    setTestingAlertId(id);
    setTestResult(null);
    try {
      const response = await api.post(`/v1/alerts/${id}/test`);
      setTestResult({
        success: response.data.success,
        message: response.data.message,
      });
      // Refresh alerts to get updated triggered count
      fetchAlerts();
    } catch (error) {
      console.error('Failed to test alert:', error);
      setTestResult({
        success: false,
        message: 'Failed to test alert',
      });
    } finally {
      setTimeout(() => {
        setTestingAlertId(null);
        setTestResult(null);
      }, 3000);
    }
  };

  const resetForm = () => {
    setNewAlert({
      name: '',
      type: 'odds_threshold',
      threshold: 2.0,
      direction: 'below',
      minProfitMargin: 1.0,
      teamId: '',
      teamName: '',
    });
  };

  const getConditionSummary = (alert: AlertRule): string => {
    const conditions = alert.conditions;

    switch (alert.type) {
      case 'odds_threshold':
        const oddsConditions = conditions as OddsThresholdCondition;
        return `Odds ${oddsConditions.direction} ${oddsConditions.threshold.toFixed(2)}`;
      case 'arbitrage_opportunity':
        const arbConditions = conditions as ArbitrageCondition;
        return `Min profit: ${arbConditions.minProfitMargin.toFixed(1)}%`;
      case 'favorite_team_event':
        const teamConditions = conditions as FavoriteTeamCondition;
        return `Team: ${teamConditions.teamName}`;
      default:
        return 'Unknown condition';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Alert Rules</h1>
            <p className="text-gray-400 mt-2">
              Set up custom alerts for odds, arbitrage, and team events
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Alert
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-sm text-gray-400">Total Alerts</div>
            <div className="text-2xl font-bold text-white">{alerts.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-sm text-gray-400">Active</div>
            <div className="text-2xl font-bold text-green-400">
              {alerts.filter((a) => a.isActive).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-sm text-gray-400">Paused</div>
            <div className="text-2xl font-bold text-yellow-400">
              {alerts.filter((a) => !a.isActive).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-sm text-gray-400">Total Triggered</div>
            <div className="text-2xl font-bold text-blue-400">
              {alerts.reduce((sum, a) => sum + a.triggeredCount, 0)}
            </div>
          </div>
        </div>

        {/* Alert Types Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Object.entries(ALERT_TYPE_INFO).map(([type, info]) => {
            const count = alerts.filter((a) => a.type === type).length;
            return (
              <div
                key={type}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <div className="text-white font-medium">{info.label}</div>
                    <div className="text-sm text-gray-400">{count} alert{count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{info.description}</p>
              </div>
            );
          })}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-lg mb-2">No alerts configured</h3>
            <p className="text-gray-400 mb-6">Create your first alert to get notified about odds changes, arbitrage opportunities, or team events.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const typeInfo = ALERT_TYPE_INFO[alert.type];
              const isTesting = testingAlertId === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`bg-gray-800 rounded-xl border p-6 transition-colors ${
                    alert.isActive ? 'border-gray-700 hover:border-gray-600' : 'border-gray-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${typeInfo.color}-500/20`}>
                        <span className="text-2xl">{typeInfo.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{alert.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            {alert.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {typeInfo.label} • {getConditionSummary(alert)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Triggered {alert.triggeredCount} times</span>
                          {alert.lastTriggeredAt && (
                            <span>
                              Last: {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Test Button */}
                      <button
                        onClick={() => handleTestAlert(alert.id)}
                        disabled={isTesting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isTesting
                            ? testResult?.success
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        }`}
                        title="Test this alert"
                      >
                        {isTesting ? (testResult ? (testResult.success ? '✓ Triggered' : '✗ Failed') : 'Testing...') : 'Test'}
                      </button>

                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleAlert(alert.id)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          alert.isActive ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                        title={alert.isActive ? 'Pause alert' : 'Activate alert'}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            alert.isActive ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete alert"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Alert Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Create Alert Rule</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Alert Name */}
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Alert Name</label>
                  <input
                    type="text"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                    placeholder="e.g., Low odds alert, My team events"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    data-testid="alert-name-input"
                  />
                </div>

                {/* Alert Type */}
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Alert Type</label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(ALERT_TYPE_INFO).map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => setNewAlert({ ...newAlert, type: type as AlertType })}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
                          newAlert.type === type
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-700/50'
                        }`}
                        data-testid={`alert-type-${type}`}
                      >
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <div className="text-white font-medium">{info.label}</div>
                          <div className="text-xs text-gray-400">{info.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields based on Type */}
                {newAlert.type === 'odds_threshold' && (
                  <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Direction</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setNewAlert({ ...newAlert, direction: 'below' })}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            newAlert.direction === 'below'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                          data-testid="direction-below"
                        >
                          Below Threshold
                        </button>
                        <button
                          onClick={() => setNewAlert({ ...newAlert, direction: 'above' })}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            newAlert.direction === 'above'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                          data-testid="direction-above"
                        >
                          Above Threshold
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Odds Threshold (decimal)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.01"
                        max="100"
                        value={newAlert.threshold}
                        onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) || 2.0 })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                        data-testid="threshold-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Alert when odds {newAlert.direction} {newAlert.threshold.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {newAlert.type === 'arbitrage_opportunity' && (
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <label className="block text-gray-400 text-sm mb-2">
                      Minimum Profit Margin (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={newAlert.minProfitMargin}
                      onChange={(e) => setNewAlert({ ...newAlert, minProfitMargin: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      data-testid="min-profit-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when arbitrage opportunities with ≥{newAlert.minProfitMargin}% profit are found
                    </p>
                  </div>
                )}

                {newAlert.type === 'favorite_team_event' && (
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <label className="block text-gray-400 text-sm mb-2">Team Name</label>
                    <input
                      type="text"
                      value={newAlert.teamName}
                      onChange={(e) => setNewAlert({ ...newAlert, teamName: e.target.value })}
                      placeholder="e.g., Liverpool, Lakers, Real Madrid"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      data-testid="team-name-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when this team has upcoming events
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={!newAlert.name.trim() || isCreating || (newAlert.type === 'favorite_team_event' && !newAlert.teamName.trim())}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="create-alert-button"
                >
                  {isCreating ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
