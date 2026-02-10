import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { PremiumGate, PremiumBadge, useIsPremium } from '../../components/PremiumGate';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LineMovementChart } from '../../components/LineMovementChart';
import { useAuthStore } from '../../store/authStore';
import { useArbitrage, useUnlockArbitrage } from '../../hooks/useArbitrage';
import { useOddsHistory } from '../../hooks/useOddsHistory';
import { api, ArbitrageOpportunity, ArbitrageLeg } from '../../services/api';
import { calculateArbitrageProfit, calculateStakes } from '../../utils/arbitrageUtils';

interface ArbitrageData extends ArbitrageOpportunity {}

function LineMovementSection({ opportunities }: { opportunities: ArbitrageData[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(
    opportunities.length > 0 ? opportunities[0].id : undefined
  );
  
  const { data: historyData, isLoading, error: historyError } = useOddsHistory(selectedEventId);

  if (opportunities.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No active opportunities to track
      </div>
    );
  }

  const selectedOpp = opportunities.find(o => o.id === selectedEventId) || opportunities[0];

  // Safely extract movements with multiple fallbacks
  const getMovements = (): any[] => {
    try {
      if (!historyData) return [];
      if (!historyData.history) return [];
      if (!Array.isArray(historyData.history)) return [];
      if (historyData.history.length === 0) return [];
      const firstHistory = historyData.history[0];
      if (!firstHistory) return [];
      if (!firstHistory.movements) return [];
      return Array.isArray(firstHistory.movements) ? firstHistory.movements : [];
    } catch (err) {
      console.warn('Error extracting movements:', err);
      return [];
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <select 
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
        >
          {opportunities.map(o => (
            <option key={o.id} value={o.id}>{o.event}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{selectedOpp.market}</span>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : historyError ? (
        <div className="h-64 flex items-center justify-center text-red-500">
          Error loading history data
        </div>
      ) : (
        <LineMovementChart 
          movements={getMovements()} 
          title={`Odds Movement: ${selectedOpp.event}`}
        />
      )}
    </div>
  );
}

function AiInsightsSection() {
  const { data: tipsData, isLoading } = useQuery({
    queryKey: ['ai-tips'],
    queryFn: async () => {
      const response = await api.get<{ tips: any[] }>('/v1/ai/tips');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const tips = tipsData?.tips || [];

  if (tips.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No AI insights available for current opportunities
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tips.slice(0, 3).map((tip: any) => (
        <div key={tip.id} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg border-l-4 border-l-green-500">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm">{tip.insight}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 capitalize">{tip.type.replace('_', ' ')}</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-green-400">{tip.confidence}% confidence</span>
              </div>
              <span className="text-xs text-gray-500">{new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArbitragePage() {
  const isPremium = useIsPremium();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [selectedTip, setSelectedTip] = useState<ArbitrageData | null>(null);
  const [unlockError, setUnlockError] = useState<{
    message: string;
    required: number;
    available: number;
  } | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  const { data: arbitrageData, isLoading } = useArbitrage(isPremium);
  const unlockMutation = useUnlockArbitrage();

  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set());
  const [excludedLeagues, setExcludedLeagues] = useState<Set<string>>(new Set());
  const [excludedBookmakers, setExcludedBookmakers] = useState<Set<string>>(new Set());
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [showBookmakerDropdown, setShowBookmakerDropdown] = useState(false);
  
  const sportDropdownRef = useRef<HTMLDivElement>(null);
  const leagueDropdownRef = useRef<HTMLDivElement>(null);
  const bookmakerDropdownRef = useRef<HTMLDivElement>(null);

  const SPORTS_OPTIONS = ['Soccer', 'Basketball', 'Tennis', 'Baseball', 'American Football', 'Ice Hockey'];
  const LEAGUE_OPTIONS = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'NBA', 'NFL', 'MLB', 'NHL'];
  const BOOKMAKER_OPTIONS = ['Bet365', 'William Hill', 'DraftKings', 'FanDuel', 'Pinnacle', 'Stake', 'Betfair'];

  const toggleSport = (sport: string) => {
    const newSports = new Set(selectedSports);
    if (newSports.has(sport)) newSports.delete(sport);
    else newSports.add(sport);
    setSelectedSports(newSports);
  };

  const clearSportFilters = () => setSelectedSports(new Set());

  const toggleExcludeLeague = (league: string) => {
    const newLeagues = new Set(excludedLeagues);
    if (newLeagues.has(league)) newLeagues.delete(league);
    else newLeagues.add(league);
    setExcludedLeagues(newLeagues);
  };

  const clearLeagueExclusions = () => setExcludedLeagues(new Set());

  const toggleExcludeBookmaker = (bookmaker: string) => {
    const newBookmakers = new Set(excludedBookmakers);
    if (newBookmakers.has(bookmaker)) newBookmakers.delete(bookmaker);
    else newBookmakers.add(bookmaker);
    setExcludedBookmakers(newBookmakers);
  };

  const clearBookmakerExclusions = () => setExcludedBookmakers(new Set());

  const applyAllFilters = (data: ArbitrageData[]) => {
    return data.filter(arb => {
      // Sport filter
      if (selectedSports.size > 0 && !selectedSports.has(arb.sport)) return false;
      
      // League filter
      if (excludedLeagues.has(arb.league)) return false;
      
      // Bookmaker filter
      const arbBookmakers = arb.legs.map(l => l.bookmaker);
      if (arbBookmakers.some(b => excludedBookmakers.has(b))) return false;
      
      return true;
    });
  };

  const handleBuyCredits = () => navigate('/credits');
  const isUnlocking = unlockMutation.isPending;

  const opportunities = arbitrageData?.opportunities || [];
  
  const lowConfidenceArbs = opportunities.filter(a => !a.isWinningTip);
  const highConfidenceArbs = opportunities.filter(a => a.isWinningTip);

  const filteredLowConfidenceArbs = applyAllFilters(lowConfidenceArbs);
  const filteredHighConfidenceArbs = applyAllFilters(highConfidenceArbs);

  const handleUnlockClick = (arb: ArbitrageData) => {
    setSelectedTip(arb);
    setUnlockError(null);
    setUnlockSuccess(false);
  };

  const handleUnlockConfirm = async () => {
    if (!selectedTip) return;

    try {
      const result = await unlockMutation.mutateAsync(selectedTip.id);
      
      if (result.success) {
        updateUser({ creditBalance: result.newBalance });
        setUnlockSuccess(true);
        setTimeout(() => {
          setSelectedTip(null);
          setUnlockSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      setUnlockError({
        message: errorData?.message || 'Failed to unlock. Please try again.',
        required: errorData?.required || selectedTip.creditCost || 10,
        available: errorData?.available || user?.creditBalance || 0,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Arbitrage Opportunities</h1>
          <p className="text-gray-400 mt-2">
            Real-time arbitrage detection across 10+ sportsbooks
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">
              {arbitrageData?.summary?.totalOpportunities || opportunities.length}
            </div>
            <div className="text-sm text-gray-400">Active Opportunities</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              +{arbitrageData?.summary?.bestROI?.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-400">Best ROI</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {((arbitrageData?.summary?.avgConfidence || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-400">Avg Confidence</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">10+</div>
            <div className="text-sm text-gray-400">Sportsbooks</div>
          </div>
        </div>
        
        {/* ... Rest of the component remains similar ... */}

        {/* Advanced Filters - Premium Only */}
        <div className="mb-6">
          {isPremium ? (
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-4 items-center min-w-max lg:min-w-0">
              {/* Multi-select sport filter */}
              <div className="relative" ref={sportDropdownRef}>
                <button
                  onClick={() => setShowSportDropdown(!showSportDropdown)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2 min-w-[160px]"
                  data-testid="sport-filter-button"
                >
                  <span>
                    {selectedSports.size === 0
                      ? 'All Sports'
                      : `${selectedSports.size} sport${selectedSports.size > 1 ? 's' : ''}`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showSportDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSportDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2">
                    <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-400">Select sports</span>
                      {selectedSports.size > 0 && (
                        <button
                          onClick={clearSportFilters}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {SPORTS_OPTIONS.map(sport => (
                      <label
                        key={sport}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/50 cursor-pointer"
                        data-testid={`sport-option-${sport.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSports.has(sport)}
                          onChange={() => toggleSport(sport)}
                          className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800 bg-gray-700"
                        />
                        <span className="text-white">{sport}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Show selected sports as chips */}
              {selectedSports.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedSports).map(sport => (
                    <span
                      key={sport}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {sport}
                      <button
                        onClick={() => toggleSport(sport)}
                        className="hover:text-green-300"
                        aria-label={`Remove ${sport} filter`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Exclude leagues dropdown */}
              <div className="relative" ref={leagueDropdownRef}>
                <button
                  onClick={() => setShowLeagueDropdown(!showLeagueDropdown)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 min-w-[160px]"
                  data-testid="exclude-league-button"
                >
                  <span>
                    {excludedLeagues.size === 0
                      ? 'Exclude Leagues'
                      : `${excludedLeagues.size} excluded`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showLeagueDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showLeagueDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2">
                    <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-400">Exclude leagues</span>
                      {excludedLeagues.size > 0 && (
                        <button
                          onClick={clearLeagueExclusions}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {LEAGUE_OPTIONS.map(league => (
                      <label
                        key={league}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/50 cursor-pointer"
                        data-testid={`exclude-league-${league.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <input
                          type="checkbox"
                          checked={excludedLeagues.has(league)}
                          onChange={() => toggleExcludeLeague(league)}
                          className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 focus:ring-offset-gray-800 bg-gray-700"
                        />
                        <span className="text-white">{league}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Show excluded leagues as chips */}
              {excludedLeagues.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Array.from(excludedLeagues).map(league => (
                    <span
                      key={league}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-1"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {league}
                      <button
                        onClick={() => toggleExcludeLeague(league)}
                        className="hover:text-red-300"
                        aria-label={`Remove ${league} exclusion`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Exclude bookmakers dropdown */}
              <div className="relative" ref={bookmakerDropdownRef}>
                <button
                  onClick={() => setShowBookmakerDropdown(!showBookmakerDropdown)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2 min-w-[180px]"
                  data-testid="exclude-bookmaker-button"
                >
                  <span>
                    {excludedBookmakers.size === 0
                      ? 'Exclude Bookmakers'
                      : `${excludedBookmakers.size} excluded`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showBookmakerDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showBookmakerDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2 max-h-64 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
                      <span className="text-sm text-gray-400">Exclude bookmakers</span>
                      {excludedBookmakers.size > 0 && (
                        <button
                          onClick={clearBookmakerExclusions}
                          className="text-xs text-orange-400 hover:text-orange-300"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {BOOKMAKER_OPTIONS.map(bookmaker => (
                      <label
                        key={bookmaker}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/50 cursor-pointer"
                        data-testid={`exclude-bookmaker-${bookmaker.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <input
                          type="checkbox"
                          checked={excludedBookmakers.has(bookmaker)}
                          onChange={() => toggleExcludeBookmaker(bookmaker)}
                          className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800 bg-gray-700"
                        />
                        <span className="text-white">{bookmaker}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Show excluded bookmakers as chips */}
              {excludedBookmakers.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Array.from(excludedBookmakers).map(bookmaker => (
                    <span
                      key={bookmaker}
                      className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm flex items-center gap-1"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {bookmaker}
                      <button
                        onClick={() => toggleExcludeBookmaker(bookmaker)}
                        className="hover:text-orange-300"
                        aria-label={`Remove ${bookmaker} exclusion`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Confidence</option>
                <option>High Only</option>
                <option>Medium & Above</option>
              </select>
              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>Sort by Profit</option>
                <option>Sort by Time</option>
                <option>Sort by Confidence</option>
              </select>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex flex-wrap gap-4 blur-sm pointer-events-none opacity-50">
                <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option>All Sports</option>
                </select>
                <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option>All Confidence</option>
                </select>
                <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option>Sort by Profit</option>
                </select>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 flex items-center space-x-2">
                  <PremiumBadge />
                  <span className="text-sm text-gray-300">Advanced filters require Premium</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Arbitrage List */}
        {isPremium ? (
          <div className="space-y-6">
            {/* Low-confidence arbs - fully visible to premium users */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-lg font-semibold text-white">Low-Confidence Opportunities</h2>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">&lt;1% profit</span>
                <span className="text-sm text-green-400">Full access</span>
              </div>
              <div className="space-y-4">
                {filteredLowConfidenceArbs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No opportunities match your filter criteria
                  </div>
                ) : (
                  filteredLowConfidenceArbs.map((arb) => (
                    <ArbitrageDetailCard
                      key={arb.id}
                      {...arb}
                      isUnlocked={true}
                      showFullDetails={true}
                      aiInsight={(arb as any).aiInsight}
                      onUnlock={() => {}}
                    />
                  ))
                )}
              </div>
            </div>

            {/* High-confidence arbs / Winning Tips - locked until credit unlock */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-lg font-semibold text-white">Winning Tips</h2>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded text-xs">≥1% profit</span>
                <span className="text-sm text-yellow-400">Credits required</span>
              </div>
              <div className="space-y-4">
                {filteredHighConfidenceArbs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No opportunities match your filter criteria
                  </div>
                ) : (
                  filteredHighConfidenceArbs.map((arb) => {
                    const isUnlocked = !!arb.isUnlocked;
                    return (
                      <ArbitrageDetailCard
                        key={arb.id}
                        {...arb}
                        isUnlocked={isUnlocked}
                        showFullDetails={isUnlocked}
                        aiInsight={(arb as any).aiInsight}
                        onUnlock={() => handleUnlockClick(arb)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <PremiumGate
            feature="Detailed arbitrage opportunities"
            showCount={arbitrageData?.count || opportunities.length}
            showBlur={true}
          >
            <div className="space-y-4">
              {opportunities.map((arb) => (
                <ArbitrageDetailCard
                  key={arb.id}
                  {...arb}
                  isUnlocked={false}
                  showFullDetails={false}
                  aiInsight={(arb as any).aiInsight}
                  onUnlock={() => {}}
                />
              ))}
            </div>
          </PremiumGate>
        )}

        {/* Line Movement Charts - Premium Only */}
        <div className="mt-8">
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-xl font-bold text-white">Line Movement Charts</h2>
            {!isPremium && <PremiumBadge />}
          </div>

          {isPremium ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <LineMovementSection opportunities={opportunities} />
            </div>
          ) : (
            <PremiumGate feature="Line movement charts" showBlur={false}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Chart placeholder
                </div>
              </div>
            </PremiumGate>
          )}
        </div>

        {/* AI Insights - Premium Only */}
        <div className="mt-8">
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-xl font-bold text-white">AI Insights</h2>
            {!isPremium && <PremiumBadge />}
          </div>

          {isPremium ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <AiInsightsSection />
            </div>
          ) : (
            <PremiumGate feature="AI-powered betting insights" showBlur={false}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="h-32 flex items-center justify-center text-gray-400">
                  AI Insights placeholder
                </div>
              </div>
            </PremiumGate>
          )}
        </div>
      </div>

      {/* Unlock Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={selectedTip !== null}
        onClose={() => {
          setSelectedTip(null);
          setUnlockError(null);
          setUnlockSuccess(false);
        }}
        onConfirm={unlockError ? handleBuyCredits : handleUnlockConfirm}
        title={unlockSuccess ? "Tip Unlocked!" : unlockError ? "Insufficient Credits" : "Unlock Winning Tip"}
        message={
          unlockSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium">Successfully unlocked!</p>
              <p className="text-gray-400 text-sm mt-1">Full betting strategy is now available.</p>
            </div>
          ) : unlockError ? (
            <div>
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400">{unlockError.message}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Required credits:</span>
                  <span className="text-white font-medium">{unlockError.required}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your balance:</span>
                  <span className="text-red-400 font-medium">{unlockError.available}</span>
                </div>
                {unlockError.required - unlockError.available > 0 && (
                  <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-400">Credits needed:</span>
                    <span className="text-yellow-400 font-medium">{unlockError.required - unlockError.available}</span>
                  </div>
                )}
              </div>
            </div>
          ) : selectedTip ? (
            <div>
              <p className="mb-4">Unlock full betting strategy for:</p>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="font-medium text-white">{selectedTip.event}</div>
                <div className="text-sm text-gray-400">{selectedTip.sport} - {selectedTip.league}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Cost:</span>
                <span className="text-xl font-bold text-white">{selectedTip.creditCost || 10} credits</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Your balance:</span>
                <span className="text-white">{user?.creditBalance || 0} credits</span>
              </div>
            </div>
          ) : ''
        }
        confirmText={unlockSuccess ? '' : unlockError ? 'Buy More Credits' : 'Unlock Now'}
        cancelText={unlockSuccess ? 'Close' : 'Cancel'}
        variant={unlockError ? 'warning' : 'info'}
        isLoading={isUnlocking}
      />
    </Layout>
  );
}

interface ArbitrageDetailCardProps {
  id: string;
  sport: string;
  event: string;
  league: string;
  market: string;
  profit?: number; // Optional - will be calculated from odds
  confidence: number;
  timeLeft: string;
  legs: ArbitrageLeg[];
  isWinningTip?: boolean;
  creditCost?: number;
  isUnlocked: boolean;
  showFullDetails: boolean;
  aiInsight?: string;
  onUnlock: () => void;
}

function ArbitrageDetailCard({
  sport,
  event,
  league,
  market,
  confidence,
  timeLeft,
  legs,
  isWinningTip,
  creditCost = 10,
  isUnlocked,
  showFullDetails,
  aiInsight,
  onUnlock,
}: ArbitrageDetailCardProps) {
  // Calculate actual profit from odds using the arbitrage formula
  const calculatedProfit = calculateArbitrageProfit(legs);
  const stakes = calculateStakes(legs, 100); // Calculate stakes for $100 total
  const totalReturn = stakes[0]?.potentialReturn || 0; // All legs return the same
  const actualProfit = Math.round((totalReturn - 100) * 100) / 100;

  const confidenceLevel = confidence >= 0.95 ? 'high' : confidence >= 0.85 ? 'medium' : 'low';
  const confidenceColors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    low: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  };

  return (
    <div className={`bg-gray-800 rounded-xl border ${isWinningTip ? 'border-green-500' : 'border-gray-700'} p-6`}>
      {isWinningTip && (
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Winning Tip
          </span>
          {!isUnlocked && (
            <span className="text-gray-400 text-sm">{creditCost} credits to unlock</span>
          )}
          {isUnlocked && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
              Unlocked
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{sport}</span>
            <span className="text-gray-600">*</span>
            <span className="text-xs text-gray-400">{league}</span>
          </div>
          <h3 className="text-xl font-semibold text-white">{event}</h3>
          <p className="text-gray-400 mt-1">{market}</p>
          {aiInsight && (
            <p className="text-gray-400 mt-3 text-sm italic border-l-2 border-green-500/50 pl-3">
              "{aiInsight}"
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-500" data-testid="profit-percentage">+{calculatedProfit.toFixed(2)}%</div>
          <div className="text-sm text-gray-400">Starts in {timeLeft}</div>
        </div>
      </div>

      {/* Confidence badge */}
      <div className="mt-4 flex items-center space-x-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${confidenceColors[confidenceLevel]}`}>
          {(confidence * 100).toFixed(0)}% confidence
        </span>
      </div>

      {/* Legs with Stakes */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-400 mb-3">Recommended bets (for $100 total stake):</div>
        {showFullDetails ? (
          <>
            <div className={`grid grid-cols-1 ${legs.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-3`}>
              {legs.map((leg, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4" data-testid={`leg-${index}`}>
                  <div className="text-white font-medium">{leg.outcome}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-bold text-green-500" data-testid={`odds-${index}`}>{leg.odds.toFixed(2)}</span>
                    <span className="text-sm text-gray-400">{leg.bookmaker}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Stake:</span>
                      <span className="text-white font-medium" data-testid={`stake-${index}`}>${stakes[index]?.stake.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Returns:</span>
                      <span className="text-green-400 font-medium">${stakes[index]?.potentialReturn.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Summary */}
            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Stake:</span>
                <span className="text-white font-semibold">$100.00</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-300">Guaranteed Return:</span>
                <span className="text-green-400 font-semibold">${totalReturn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-300">Guaranteed Profit:</span>
                <span className="text-green-400 font-bold text-lg" data-testid="guaranteed-profit">${actualProfit.toFixed(2)} ({calculatedProfit.toFixed(2)}%)</span>
              </div>
            </div>
          </>
        ) : (
          <div className="relative">
            {/* Blurred preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 blur-sm pointer-events-none select-none">
              {legs.map((_, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-white font-medium">••••••••</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-bold text-green-500">•.••</span>
                    <span className="text-sm text-gray-400">••••••</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-lg">
              <div className="text-center">
                <svg className="w-8 h-8 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm text-gray-300">Unlock to see betting details</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex items-center space-x-4">
        {isWinningTip && !isUnlocked ? (
          <button
            onClick={onUnlock}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Unlock Full Details ({creditCost} credits)
          </button>
        ) : isWinningTip && isUnlocked ? (
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            View Full Strategy
          </button>
        ) : (
          <button className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
            View Details
          </button>
        )}
        <button
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Bookmark this opportunity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
