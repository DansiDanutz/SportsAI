import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import debounce from 'lodash/debounce';

type TabType = 'teams' | 'leagues' | 'markets';

interface TeamSearchResult {
  id: string;
  name: string;
  league: string;
  sport: string;
  sportKey: string;
}

interface TeamAlertSettings {
  eventNotifications: boolean;
  oddsThreshold: number | null;
  arbitrageAlerts: boolean;
}

interface Favorite {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
}

export function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'team' | 'league' | 'market'>('team');
  const [newEntityId, setNewEntityId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [alertConfigModal, setAlertConfigModal] = useState<{ show: boolean; teamId: string; teamName: string } | null>(null);
  const [alertSettings, setAlertSettings] = useState<TeamAlertSettings>({
    eventNotifications: true,
    oddsThreshold: null,
    arbitrageAlerts: false,
  });
  const [alertSaveSuccess, setAlertSaveSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Autocomplete state for team search
  const [teamSearchResults, setTeamSearchResults] = useState<TeamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search function - only search when 4+ characters are typed
  const searchTeams = useCallback(
    debounce(async (query: string) => {
      if (query.length < 4) {
        setTeamSearchResults([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get(`/v1/events/teams/search?q=${encodeURIComponent(query)}&limit=10`);
        setTeamSearchResults(response.data.teams || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to search teams:', error);
        setTeamSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, []);

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab]);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/v1/favorites');
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      await api.delete(`/v1/favorites/${favoriteId}`);
      // Update state to remove the deleted favorite
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      // Also remove from selection if selected
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(favoriteId);
        return next;
      });
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    try {
      // Single bulk request with all IDs
      const response = await api.post('/v1/favorites/bulk-delete', {
        ids: Array.from(selectedIds),
      });

      if (response.data.success) {
        // Remove deleted favorites from state
        const deletedIds = new Set(response.data.ids);
        setFavorites(prev => prev.filter(f => !deletedIds.has(f.id)));
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    } catch (error) {
      console.error('Failed to bulk delete favorites:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllInTab = () => {
    const entityType = activeTab === 'teams' ? 'team' : activeTab === 'leagues' ? 'league' : 'market';
    const tabFavorites = favorites.filter(f => f.entityType === entityType);
    setSelectedIds(new Set(tabFavorites.map(f => f.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleAddFavorite = async () => {
    // For teams, require a selected team from autocomplete (when 4+ chars entered)
    if (addModalType === 'team') {
      // If user typed 4+ chars but didn't select from suggestions, don't allow adding
      if (newEntityId.length >= 4 && !selectedTeam) {
        return; // Must select from suggestions
      }
      if (!selectedTeam && newEntityId.length < 4) {
        return; // Must type at least 4 characters
      }
    } else if (!newEntityId.trim()) {
      return;
    }

    setIsAdding(true);
    try {
      // For teams, use the selected team's ID; for others, use the text input
      const entityId = addModalType === 'team' && selectedTeam
        ? `team-${selectedTeam.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
        : newEntityId.trim().toLowerCase();

      const response = await api.post('/v1/favorites', {
        entityType: addModalType,
        entityId,
      });
      if (response.data.success) {
        setFavorites(prev => [...prev, response.data.favorite]);
        setNewEntityId('');
        setSelectedTeam(null);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const openAddModal = (type: 'team' | 'league' | 'market') => {
    setAddModalType(type);
    setNewEntityId('');
    setSelectedTeam(null);
    setTeamSearchResults([]);
    setShowSuggestions(false);
    setShowAddModal(true);
  };

  // Handle team search input change
  const handleTeamSearchChange = (value: string) => {
    setNewEntityId(value);
    setSelectedTeam(null); // Clear selection when user types
    searchTeams(value);
  };

  // Handle team selection from suggestions
  const handleSelectTeam = (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setNewEntityId(team.name);
    setShowSuggestions(false);
  };

  const openAlertConfig = (teamId: string, teamName: string) => {
    // In production, load existing settings from API
    setAlertSettings({
      eventNotifications: true,
      oddsThreshold: null,
      arbitrageAlerts: false,
    });
    setAlertSaveSuccess(false);
    setAlertConfigModal({ show: true, teamId, teamName });
  };

  const handleSaveAlertSettings = async () => {
    // In production, save to API
    // await api.post(`/v1/favorites/${alertConfigModal?.teamId}/alerts`, alertSettings);
    setAlertSaveSuccess(true);
    setTimeout(() => {
      setAlertConfigModal(null);
      setAlertSaveSuccess(false);
    }, 1500);
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Favorites</h1>
          <p className="text-gray-400 mt-2">
            Your saved teams, leagues, and markets
          </p>
        </div>

        {/* Statistics Bar */}
        {!loading && (
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Total Favorites</div>
              <div className="text-2xl font-bold text-white" data-testid="total-favorites-count">{favorites.length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Teams</div>
              <div className="text-2xl font-bold text-blue-400" data-testid="teams-count">{favorites.filter(f => f.entityType === 'team').length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Leagues</div>
              <div className="text-2xl font-bold text-green-400" data-testid="leagues-count">{favorites.filter(f => f.entityType === 'league').length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Markets</div>
              <div className="text-2xl font-bold text-purple-400" data-testid="markets-count">{favorites.filter(f => f.entityType === 'market').length}</div>
            </div>
          </div>
        )}

        {/* Tabs and Bulk Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'teams'
                  ? 'bg-green-500/20 text-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveTab('leagues')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'leagues'
                  ? 'bg-green-500/20 text-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Leagues
            </button>
            <button
              onClick={() => setActiveTab('markets')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'markets'
                  ? 'bg-green-500/20 text-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Markets
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-3">
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Select Multiple
              </button>
            ) : (
              <>
                <span className="text-gray-400 text-sm">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={selectAllInTab}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || isBulkDeleting}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'teams' && (
          <TeamsTab
            favorites={favorites.filter(f => f.entityType === 'team')}
            onRemove={handleRemoveFavorite}
            loading={loading}
            onAdd={() => openAddModal('team')}
            onConfigureAlerts={openAlertConfig}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        )}
        {activeTab === 'leagues' && (
          <LeaguesTab
            favorites={favorites.filter(f => f.entityType === 'league')}
            onRemove={handleRemoveFavorite}
            loading={loading}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        )}
        {activeTab === 'markets' && (
          <MarketsTab
            favorites={favorites.filter(f => f.entityType === 'market')}
            onRemove={handleRemoveFavorite}
            loading={loading}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        )}

        {/* Upcoming Events for Favorites */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Events</h2>
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Premier League • Tomorrow 15:00</div>
                  <div className="text-white font-medium mt-1">Liverpool FC vs Manchester United</div>
                </div>
                <button className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/30">
                  View Odds
                </button>
              </div>
            </div>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">NBA • Today 20:30</div>
                  <div className="text-white font-medium mt-1">Los Angeles Lakers vs Golden State Warriors</div>
                </div>
                <button className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/30">
                  View Odds
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">La Liga • Saturday 21:00</div>
                  <div className="text-white font-medium mt-1">Real Madrid vs Atletico Madrid</div>
                </div>
                <button className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/30">
                  View Odds
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Favorite Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">
                Add {addModalType.charAt(0).toUpperCase() + addModalType.slice(1)} to Favorites
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-gray-400 text-sm mb-2">
                    {addModalType === 'team' ? 'Team Name' : addModalType === 'league' ? 'League Name' : 'Market Type'}
                  </label>
                  {addModalType === 'team' ? (
                    <>
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={newEntityId}
                          onChange={(e) => handleTeamSearchChange(e.target.value)}
                          onFocus={() => newEntityId.length >= 4 && teamSearchResults.length > 0 && setShowSuggestions(true)}
                          placeholder="Type at least 4 letters (e.g., Liver, Arse, Real)"
                          className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                            selectedTeam ? 'border-green-500' : 'border-gray-600 focus:border-green-500'
                          }`}
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          </div>
                        )}
                        {selectedTeam && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Autocomplete Suggestions Dropdown */}
                      {showSuggestions && teamSearchResults.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {teamSearchResults.map((team) => (
                            <button
                              key={team.id}
                              onClick={() => handleSelectTeam(team)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                            >
                              <div className="text-white font-medium">{team.name}</div>
                              <div className="text-gray-400 text-sm">{team.league} • {team.sport}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* No results message */}
                      {showSuggestions && newEntityId.length >= 4 && teamSearchResults.length === 0 && !isSearching && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-400">
                          No teams found matching "{newEntityId}"
                        </div>
                      )}
                      {/* Hint message */}
                      {newEntityId.length > 0 && newEntityId.length < 4 && (
                        <p className="text-yellow-500 text-xs mt-2">
                          Type at least 4 characters to search teams
                        </p>
                      )}
                      {selectedTeam && (
                        <p className="text-green-500 text-xs mt-2">
                          ✓ Selected: {selectedTeam.name} ({selectedTeam.league})
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={newEntityId}
                      onChange={(e) => setNewEntityId(e.target.value)}
                      placeholder={addModalType === 'league' ? 'e.g., Premier League, NBA' : 'e.g., moneyline, spread'}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFavorite}
                  disabled={
                    addModalType === 'team'
                      ? (!selectedTeam || isAdding)
                      : (!newEntityId.trim() || isAdding)
                  }
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? 'Adding...' : 'Add to Favorites'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Configuration Modal */}
        {alertConfigModal?.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-2">
                Configure Alerts
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Set up notifications for {alertConfigModal.teamName}
              </p>

              {alertSaveSuccess ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">Settings Saved!</p>
                  <p className="text-gray-400 text-sm mt-1">Your alert preferences have been updated.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Event Notifications */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                      <div>
                        <div className="text-white font-medium">Event Notifications</div>
                        <div className="text-gray-400 text-sm">Get notified when events start</div>
                      </div>
                      <button
                        onClick={() => setAlertSettings(prev => ({ ...prev, eventNotifications: !prev.eventNotifications }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          alertSettings.eventNotifications ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            alertSettings.eventNotifications ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Odds Threshold Alert */}
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-white font-medium">Odds Threshold Alert</div>
                          <div className="text-gray-400 text-sm">Alert when odds exceed threshold</div>
                        </div>
                        <button
                          onClick={() => setAlertSettings(prev => ({
                            ...prev,
                            oddsThreshold: prev.oddsThreshold === null ? 2.0 : null
                          }))}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            alertSettings.oddsThreshold !== null ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              alertSettings.oddsThreshold !== null ? 'left-7' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                      {alertSettings.oddsThreshold !== null && (
                        <div className="flex items-center gap-3 mt-3">
                          <label className="text-gray-400 text-sm">Threshold:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1.01"
                            max="100"
                            value={alertSettings.oddsThreshold}
                            onChange={(e) => setAlertSettings(prev => ({
                              ...prev,
                              oddsThreshold: parseFloat(e.target.value) || 2.0
                            }))}
                            className="w-24 px-3 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-green-500"
                          />
                          <span className="text-gray-400 text-sm">decimal odds</span>
                        </div>
                      )}
                    </div>

                    {/* Arbitrage Alerts */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                      <div>
                        <div className="text-white font-medium">Arbitrage Alerts</div>
                        <div className="text-gray-400 text-sm">Notify on arbitrage opportunities</div>
                      </div>
                      <button
                        onClick={() => setAlertSettings(prev => ({ ...prev, arbitrageAlerts: !prev.arbitrageAlerts }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          alertSettings.arbitrageAlerts ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            alertSettings.arbitrageAlerts ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setAlertConfigModal(null)}
                      className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAlertSettings}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Save Settings
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Mock team data for display (in production, fetch from API)
const MOCK_TEAMS: Record<string, { name: string; league: string; country: string; upcomingEvents: number }> = {
  'team-liverpool': { name: 'Liverpool FC', league: 'Premier League', country: 'England', upcomingEvents: 3 },
  'team-lakers': { name: 'Los Angeles Lakers', league: 'NBA', country: 'USA', upcomingEvents: 2 },
  'team-realmadrid': { name: 'Real Madrid', league: 'La Liga', country: 'Spain', upcomingEvents: 2 },
  'team-yankees': { name: 'New York Yankees', league: 'MLB', country: 'USA', upcomingEvents: 5 },
  'team-arsenal': { name: 'Arsenal', league: 'Premier League', country: 'England', upcomingEvents: 4 },
  'team-chelsea': { name: 'Chelsea', league: 'Premier League', country: 'England', upcomingEvents: 3 },
  'team-mancity': { name: 'Manchester City', league: 'Premier League', country: 'England', upcomingEvents: 4 },
  'team-barcelona': { name: 'FC Barcelona', league: 'La Liga', country: 'Spain', upcomingEvents: 3 },
};

interface TabProps {
  favorites: Favorite[];
  onRemove: (id: string) => void;
  loading: boolean;
  onAdd?: () => void;
  onConfigureAlerts?: (teamId: string, teamName: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

// Teams Tab Content
function TeamsTab({ favorites, onRemove, loading, onAdd, onConfigureAlerts, selectionMode, selectedIds, onToggleSelection }: TabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map(favorite => {
        const teamData = MOCK_TEAMS[favorite.entityId] || {
          name: favorite.entityId,
          league: 'Unknown',
          country: 'Unknown',
          upcomingEvents: 0,
        };
        const isSelected = selectedIds?.has(favorite.id) || false;
        return (
          <div
            key={favorite.id}
            className={`relative ${selectionMode ? 'cursor-pointer' : ''}`}
            onClick={selectionMode ? () => onToggleSelection?.(favorite.id) : undefined}
          >
            {selectionMode && (
              <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'bg-green-500 border-green-500' : 'bg-gray-800/80 border-gray-500'
              }`}>
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <FavoriteTeamCard
              favoriteId={favorite.id}
              name={teamData.name}
              league={teamData.league}
              country={teamData.country}
              upcomingEvents={teamData.upcomingEvents}
              onRemove={selectionMode ? () => {} : onRemove}
              onConfigureAlerts={selectionMode ? undefined : onConfigureAlerts}
              isSelected={isSelected}
              selectionMode={selectionMode}
            />
          </div>
        );
      })}

      {favorites.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-400">
          <p>No team favorites yet. Add some teams to track!</p>
        </div>
      )}

      {/* Add New Card */}
      {!selectionMode && (
        <button
          onClick={onAdd}
          className="bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl p-6 hover:border-green-500 hover:bg-gray-800/50 transition-colors flex flex-col items-center justify-center min-h-[180px]"
        >
          <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-gray-400 font-medium">Add Team</span>
        </button>
      )}
    </div>
  );
}

// Mock league data
const MOCK_LEAGUES: Record<string, { name: string; sport: string; country: string; teams: number; upcomingEvents: number }> = {
  'league-premier': { name: 'Premier League', sport: 'Soccer', country: 'England', teams: 20, upcomingEvents: 10 },
  'league-nba': { name: 'NBA', sport: 'Basketball', country: 'USA', teams: 30, upcomingEvents: 15 },
  'league-laliga': { name: 'La Liga', sport: 'Soccer', country: 'Spain', teams: 20, upcomingEvents: 10 },
  'league-mlb': { name: 'MLB', sport: 'Baseball', country: 'USA', teams: 30, upcomingEvents: 12 },
  'league-nfl': { name: 'NFL', sport: 'American Football', country: 'USA', teams: 32, upcomingEvents: 8 },
};

// Leagues Tab Content
function LeaguesTab({ favorites, onRemove, loading }: TabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map(favorite => {
        const leagueData = MOCK_LEAGUES[favorite.entityId] || {
          name: favorite.entityId,
          sport: 'Unknown',
          country: 'Unknown',
          teams: 0,
          upcomingEvents: 0,
        };
        return (
          <FavoriteLeagueCard
            key={favorite.id}
            favoriteId={favorite.id}
            name={leagueData.name}
            sport={leagueData.sport}
            country={leagueData.country}
            teams={leagueData.teams}
            upcomingEvents={leagueData.upcomingEvents}
            onRemove={onRemove}
          />
        );
      })}

      {favorites.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-400">
          <p>No league favorites yet. Add some leagues to track!</p>
        </div>
      )}

      {/* Add New Card */}
      <button className="bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl p-6 hover:border-green-500 hover:bg-gray-800/50 transition-colors flex flex-col items-center justify-center min-h-[180px]">
        <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-gray-400 font-medium">Add League</span>
      </button>
    </div>
  );
}

// Mock market data
const MOCK_MARKETS: Record<string, { name: string; sport: string; description: string }> = {
  'market-winner': { name: 'Match Winner', sport: 'Soccer', description: 'Bet on the outcome of the match' },
  'market-overunder': { name: 'Over/Under Goals', sport: 'Soccer', description: 'Bet on total goals scored' },
  'market-spread': { name: 'Point Spread', sport: 'Basketball', description: 'Bet against the spread' },
  'market-moneyline': { name: 'Moneyline', sport: 'All Sports', description: 'Bet on outright winner' },
  'market-btts': { name: 'Both Teams to Score', sport: 'Soccer', description: 'Will both teams score?' },
};

// Markets Tab Content
function MarketsTab({ favorites, onRemove, loading }: TabProps) {
  // Get pinned markets from localStorage (synced with EventDetailPage)
  const [pinnedMarkets, setPinnedMarkets] = useState<string[]>(() => {
    const stored = localStorage.getItem('favoriteMarkets');
    return stored ? JSON.parse(stored) : [];
  });

  const handleUnpinMarket = (marketName: string) => {
    const newPinned = pinnedMarkets.filter(m => m !== marketName);
    localStorage.setItem('favoriteMarkets', JSON.stringify(newPinned));
    setPinnedMarkets(newPinned);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Market descriptions for pinned markets
  const marketDescriptions: Record<string, { sport: string; description: string }> = {
    'Match Result': { sport: 'Soccer', description: 'Bet on the match outcome - Home Win, Draw, or Away Win' },
    'Over/Under 2.5 Goals': { sport: 'Soccer', description: 'Total goals scored in the match - over or under 2.5' },
    'Both Teams to Score': { sport: 'Soccer', description: 'Will both teams score in the match?' },
    'First Goal Scorer': { sport: 'Soccer', description: 'Which player will score the first goal' },
    'Correct Score 3-1': { sport: 'Soccer', description: 'Predict the exact final score' },
    'Moneyline': { sport: 'Basketball', description: 'Bet on which team will win the game' },
    'Total Points': { sport: 'Basketball', description: 'Total combined points scored' },
    'Spread': { sport: 'Basketball', description: 'Point spread betting' },
    'Match Winner': { sport: 'Tennis', description: 'Bet on who will win the match' },
    'Total Sets': { sport: 'Tennis', description: 'Number of sets played in the match' },
  };

  const hasPinnedMarkets = pinnedMarkets.length > 0;
  const hasApiFavorites = favorites.length > 0;
  const hasAnyMarkets = hasPinnedMarkets || hasApiFavorites;

  return (
    <div className="space-y-6">
      {/* Pinned Markets Section */}
      {hasPinnedMarkets && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-500">📌</span>
            <h3 className="text-lg font-medium text-white">Pinned Markets</h3>
            <span className="text-sm text-gray-400">({pinnedMarkets.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedMarkets.map(marketName => {
              const marketInfo = marketDescriptions[marketName] || { sport: 'Various', description: 'Pinned market type' };
              return (
                <div
                  key={marketName}
                  className="bg-gray-800 rounded-xl border border-yellow-500/50 ring-1 ring-yellow-500/30 p-6 hover:border-yellow-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">📌</span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded">
                        {marketInfo.sport}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnpinMarket(marketName)}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Unpin market"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <h4 className="text-white font-semibold mb-2">{marketName}</h4>
                  <p className="text-gray-400 text-sm">{marketInfo.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* API Favorites Section */}
      {hasApiFavorites && (
        <div>
          {hasPinnedMarkets && (
            <h3 className="text-lg font-medium text-white mb-4">Saved Markets</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(favorite => {
              const marketData = MOCK_MARKETS[favorite.entityId] || {
                name: favorite.entityId,
                sport: 'Unknown',
                description: 'No description',
              };
              return (
                <FavoriteMarketCard
                  key={favorite.id}
                  favoriteId={favorite.id}
                  name={marketData.name}
                  sport={marketData.sport}
                  description={marketData.description}
                  onRemove={onRemove}
                />
              );
            })}
          </div>
        </div>
      )}

      {!hasAnyMarkets && (
        <div className="text-center py-8 text-gray-400">
          <p>No market favorites yet. Pin markets from event pages to track them here!</p>
        </div>
      )}

      {/* Add New Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button className="bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl p-6 hover:border-green-500 hover:bg-gray-800/50 transition-colors flex flex-col items-center justify-center min-h-[180px]">
          <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-gray-400 font-medium">Add Market</span>
        </button>
      </div>
    </div>
  );
}

interface FavoriteTeamCardProps {
  favoriteId: string;
  name: string;
  league: string;
  country: string;
  upcomingEvents: number;
  onRemove: (id: string) => void;
  onConfigureAlerts?: (teamId: string, teamName: string) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}

function FavoriteTeamCard({ favoriteId, name, league, country, upcomingEvents, onRemove, onConfigureAlerts, isSelected, selectionMode }: FavoriteTeamCardProps) {
  return (
    <div className={`bg-gray-800 rounded-xl border p-6 transition-colors ${
      isSelected ? 'border-green-500 ring-2 ring-green-500/50' : 'border-gray-700 hover:border-gray-600'
    } ${selectionMode ? 'pl-12' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-xl font-bold text-gray-400">{name.charAt(0)}</span>
        </div>
        <button
          onClick={() => onRemove(favoriteId)}
          className="text-yellow-500 hover:text-red-400 transition-colors"
          title="Remove from favorites"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-gray-400 text-sm">{league}</p>
        <p className="text-gray-500 text-xs mt-1">{country}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{upcomingEvents} upcoming events</span>
          <button className="text-green-500 hover:text-green-400 font-medium">
            View →
          </button>
        </div>
        {onConfigureAlerts && (
          <button
            onClick={() => onConfigureAlerts(favoriteId, name)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Configure Alerts
          </button>
        )}
      </div>
    </div>
  );
}

interface FavoriteLeagueCardProps {
  favoriteId: string;
  name: string;
  sport: string;
  country: string;
  teams: number;
  upcomingEvents: number;
  onRemove: (id: string) => void;
}

function FavoriteLeagueCard({ favoriteId, name, sport, country, teams, upcomingEvents, onRemove }: FavoriteLeagueCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
          <span className="text-xl font-bold text-blue-400">{name.charAt(0)}</span>
        </div>
        <button
          onClick={() => onRemove(favoriteId)}
          className="text-yellow-500 hover:text-red-400 transition-colors"
          title="Remove from favorites"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-gray-400 text-sm">{sport} • {country}</p>
        <p className="text-gray-500 text-xs mt-1">{teams} teams</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{upcomingEvents} upcoming events</span>
          <button className="text-green-500 hover:text-green-400 font-medium">
            View →
          </button>
        </div>
      </div>
    </div>
  );
}

interface FavoriteMarketCardProps {
  favoriteId: string;
  name: string;
  sport: string;
  description: string;
  onRemove: (id: string) => void;
}

function FavoriteMarketCard({ favoriteId, name, sport, description, onRemove }: FavoriteMarketCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <button
          onClick={() => onRemove(favoriteId)}
          className="text-yellow-500 hover:text-red-400 transition-colors"
          title="Remove from favorites"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-gray-400 text-sm">{sport}</p>
        <p className="text-gray-500 text-xs mt-1">{description}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <button className="text-green-500 hover:text-green-400 font-medium text-sm">
          Find Events →
        </button>
      </div>
    </div>
  );
}
