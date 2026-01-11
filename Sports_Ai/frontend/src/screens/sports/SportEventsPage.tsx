import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PullToRefresh } from '../../components/PullToRefresh';
import { usePreferencesStore, formatOdds, formatEventTimeWithTimezone } from '../../store/preferencesStore';
import { api } from '../../services/api';

// Sport-specific settings state (would be persisted in a real app)
interface SportSettings {
  defaultOddsDisplay: 'decimal' | 'american' | 'fractional';
  showLiveOnly: boolean;
  minOdds: number;
  maxOdds: number;
  favoriteLeagues: string[];
}

const defaultSportSettings: SportSettings = {
  defaultOddsDisplay: 'decimal',
  showLiveOnly: false,
  minOdds: 1.01,
  maxOdds: 100,
  favoriteLeagues: [],
};

// Sports data for display
const sportsData: Record<string, { name: string; icon: string; color: string }> = {
  soccer: { name: 'Soccer', icon: '⚽', color: 'bg-green-500' },
  basketball: { name: 'Basketball', icon: '🏀', color: 'bg-orange-500' },
  tennis: { name: 'Tennis', icon: '🎾', color: 'bg-yellow-500' },
  baseball: { name: 'Baseball', icon: '⚾', color: 'bg-red-500' },
  american_football: { name: 'American Football', icon: '🏈', color: 'bg-blue-500' },
  ice_hockey: { name: 'Ice Hockey', icon: '🏒', color: 'bg-cyan-500' },
  cricket: { name: 'Cricket', icon: '🏏', color: 'bg-emerald-500' },
  rugby: { name: 'Rugby', icon: '🏉', color: 'bg-gray-500' },
  mma: { name: 'MMA / UFC', icon: '🥊', color: 'bg-red-600' },
  esports: { name: 'eSports', icon: '🎮', color: 'bg-purple-500' },
};

// Time window filter options
const timeWindowOptions = [
  { value: 'all', label: 'All Times' },
  { value: '1h', label: 'Next 1 hour', hours: 1 },
  { value: '12h', label: 'Next 12 hours', hours: 12 },
  { value: 'today', label: 'Today', hours: 24 },
  { value: '7d', label: 'Next 7 days', hours: 168 },
  { value: 'custom', label: 'Custom Range' },
];

// Event status filter options
const statusOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
];

// Helper to check if an event is "live" (within the first hour of start)
const isEventLive = (startDate: Date) => {
  const now = new Date();
  const eventStartHour = startDate.getTime();
  const hourAfterStart = eventStartHour + 60 * 60 * 1000;
  // Event is "live" if it started within the last hour
  return now.getTime() >= eventStartHour && now.getTime() < hourAfterStart;
};

// Helper to check if an event is upcoming (hasn't started yet)
const isEventUpcoming = (startDate: Date) => {
  const now = new Date();
  return startDate.getTime() > now.getTime();
};

// Helper to generate event dates relative to now
const getEventDate = (hoursFromNow: number) => {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
};

interface MockEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startDate: Date;
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
}

// Mock events data by sport with actual dates
// Some events are "live" (started recently, negative hours = started in past)
const getMockEventsBySport = (): Record<string, MockEvent[]> => ({
  soccer: [
    // Live events (started recently)
    { id: '1', homeTeam: 'Liverpool FC', awayTeam: 'Manchester United', league: 'Premier League', startDate: getEventDate(-0.3), homeOdds: 1.75, drawOdds: 3.40, awayOdds: 4.20 },
    { id: '2', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', league: 'La Liga', startDate: getEventDate(-0.5), homeOdds: 2.10, drawOdds: 3.20, awayOdds: 3.50 },
    { id: '3', homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', league: 'Bundesliga', startDate: getEventDate(6), homeOdds: 1.55, drawOdds: 4.00, awayOdds: 5.50 },
    { id: '4', homeTeam: 'PSG', awayTeam: 'Marseille', league: 'Ligue 1', startDate: getEventDate(10), homeOdds: 1.40, drawOdds: 4.50, awayOdds: 7.00 },
    { id: '5', homeTeam: 'Manchester City', awayTeam: 'Arsenal', league: 'Premier League', startDate: getEventDate(18), homeOdds: 1.65, drawOdds: 3.80, awayOdds: 4.50 },
    { id: '6', homeTeam: 'Chelsea', awayTeam: 'Tottenham', league: 'Premier League', startDate: getEventDate(28), homeOdds: 2.00, drawOdds: 3.40, awayOdds: 3.60 },
    { id: '7', homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', league: 'La Liga', startDate: getEventDate(36), homeOdds: 1.80, drawOdds: 3.50, awayOdds: 4.20 },
    { id: '8', homeTeam: 'Juventus', awayTeam: 'AC Milan', league: 'Serie A', startDate: getEventDate(48), homeOdds: 2.20, drawOdds: 3.20, awayOdds: 3.30 },
    { id: '9', homeTeam: 'Inter Milan', awayTeam: 'Napoli', league: 'Serie A', startDate: getEventDate(72), homeOdds: 1.90, drawOdds: 3.40, awayOdds: 3.80 },
    { id: '10', homeTeam: 'Newcastle', awayTeam: 'Aston Villa', league: 'Premier League', startDate: getEventDate(96), homeOdds: 2.10, drawOdds: 3.30, awayOdds: 3.40 },
    { id: '11', homeTeam: 'Valencia', awayTeam: 'Real Betis', league: 'La Liga', startDate: getEventDate(120), homeOdds: 2.30, drawOdds: 3.20, awayOdds: 3.10 },
    { id: '12', homeTeam: 'RB Leipzig', awayTeam: 'Bayer Leverkusen', league: 'Bundesliga', startDate: getEventDate(144), homeOdds: 2.40, drawOdds: 3.40, awayOdds: 2.90 },
  ],
  basketball: [
    // Live event
    { id: '1', homeTeam: 'Los Angeles Lakers', awayTeam: 'Golden State Warriors', league: 'NBA', startDate: getEventDate(-0.4), homeOdds: 1.85, awayOdds: 1.95 },
    // Upcoming events
    { id: '2', homeTeam: 'Boston Celtics', awayTeam: 'Miami Heat', league: 'NBA', startDate: getEventDate(8), homeOdds: 1.70, awayOdds: 2.15 },
    { id: '3', homeTeam: 'Milwaukee Bucks', awayTeam: 'Philadelphia 76ers', league: 'NBA', startDate: getEventDate(24), homeOdds: 1.90, awayOdds: 1.90 },
  ],
  tennis: [
    // Live event
    { id: '1', homeTeam: 'Novak Djokovic', awayTeam: 'Carlos Alcaraz', league: 'ATP Finals', startDate: getEventDate(-0.2), homeOdds: 1.65, awayOdds: 2.20 },
    { id: '2', homeTeam: 'Jannik Sinner', awayTeam: 'Daniil Medvedev', league: 'ATP 1000', startDate: getEventDate(20), homeOdds: 1.80, awayOdds: 2.00 },
  ],
  baseball: [
    { id: '1', homeTeam: 'New York Yankees', awayTeam: 'Boston Red Sox', league: 'MLB', startDate: getEventDate(0.8), homeOdds: 1.75, awayOdds: 2.05 },
    { id: '2', homeTeam: 'Los Angeles Dodgers', awayTeam: 'San Francisco Giants', league: 'MLB', startDate: getEventDate(26), homeOdds: 1.60, awayOdds: 2.30 },
  ],
  american_football: [
    { id: '1', homeTeam: 'Kansas City Chiefs', awayTeam: 'Buffalo Bills', league: 'NFL', startDate: getEventDate(14), homeOdds: 1.65, awayOdds: 2.25 },
    { id: '2', homeTeam: 'Philadelphia Eagles', awayTeam: 'Dallas Cowboys', league: 'NFL', startDate: getEventDate(38), homeOdds: 1.80, awayOdds: 2.00 },
  ],
  ice_hockey: [
    { id: '1', homeTeam: 'Toronto Maple Leafs', awayTeam: 'Montreal Canadiens', league: 'NHL', startDate: getEventDate(0.6), homeOdds: 1.70, awayOdds: 2.10 },
    { id: '2', homeTeam: 'Edmonton Oilers', awayTeam: 'Calgary Flames', league: 'NHL', startDate: getEventDate(22), homeOdds: 1.85, awayOdds: 1.95 },
  ],
  cricket: [
    { id: '1', homeTeam: 'India', awayTeam: 'Australia', league: 'Test Series', startDate: getEventDate(16), homeOdds: 1.90, awayOdds: 1.90 },
    { id: '2', homeTeam: 'England', awayTeam: 'South Africa', league: 'ODI', startDate: getEventDate(40), homeOdds: 2.00, awayOdds: 1.80 },
  ],
  rugby: [
    { id: '1', homeTeam: 'New Zealand', awayTeam: 'South Africa', league: 'Rugby Championship', startDate: getEventDate(30), homeOdds: 1.55, awayOdds: 2.50 },
    { id: '2', homeTeam: 'Ireland', awayTeam: 'France', league: 'Six Nations', startDate: getEventDate(54), homeOdds: 2.10, awayOdds: 1.75 },
  ],
  mma: [
    { id: '1', homeTeam: 'Jon Jones', awayTeam: 'Tom Aspinall', league: 'UFC Heavyweight', startDate: getEventDate(50), homeOdds: 1.75, awayOdds: 2.05 },
    { id: '2', homeTeam: 'Islam Makhachev', awayTeam: 'Charles Oliveira', league: 'UFC Lightweight', startDate: getEventDate(170), homeOdds: 1.45, awayOdds: 2.75 },
  ],
  esports: [
    { id: '1', homeTeam: 'Team Liquid', awayTeam: 'G2 Esports', league: 'League of Legends LEC', startDate: getEventDate(0.4), homeOdds: 1.90, awayOdds: 1.90 },
    { id: '2', homeTeam: 'FaZe Clan', awayTeam: 'Cloud9', league: 'CS2 Major', startDate: getEventDate(20), homeOdds: 2.10, awayOdds: 1.75 },
    { id: '3', homeTeam: 'T1', awayTeam: 'Gen.G', league: 'League of Legends LCK', startDate: getEventDate(44), homeOdds: 1.65, awayOdds: 2.20 },
  ],
});

const EVENTS_PER_PAGE = 5;

export function SportEventsPage() {
  const { sportKey } = useParams<{ sportKey: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { oddsFormat, timezone } = usePreferencesStore();
  const [showSettings, setShowSettings] = useState(false);
  const [sportSettings, setSportSettings] = useState<SportSettings>(defaultSportSettings);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<Set<string>>(new Set());
  const [addingFavorite, setAddingFavorite] = useState<string | null>(null);
  const [favoriteSuccess, setFavoriteSuccess] = useState<string | null>(null);

  // Get filter and page from URL params
  const leagueFilter = searchParams.get('league') || 'all';
  const timeFilter = searchParams.get('time') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const minOddsFilter = parseFloat(searchParams.get('minOdds') || '1.01');
  const maxOddsFilter = parseFloat(searchParams.get('maxOdds') || '100');
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Custom date range state
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(startDateParam || '');
  const [customEndDate, setCustomEndDate] = useState(endDateParam || '');
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({});

  // Fetch user's favorite teams on mount
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get('/v1/favorites');
        const favorites = response.data.favorites || [];
        const teamIds = favorites
          .filter((f: { entityType: string }) => f.entityType === 'team')
          .map((f: { entityId: string }) => f.entityId);
        setFavoriteTeams(new Set(teamIds));
      } catch (error) {
        console.error('Failed to fetch favorites:', error);
      }
    };
    fetchFavorites();
  }, []);

  // State for error display
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  // Refresh key to trigger re-render of mock data with fresh timestamps
  const [refreshKey, setRefreshKey] = useState(0);

  // Pull to refresh handler - refreshes favorites and events
  const handleRefresh = useCallback(async () => {
    try {
      // Refresh favorites
      const response = await api.get('/v1/favorites');
      const favorites = response.data.favorites || [];
      const teamIds = favorites
        .filter((f: { entityType: string }) => f.entityType === 'team')
        .map((f: { entityId: string }) => f.entityId);
      setFavoriteTeams(new Set(teamIds));

      // Trigger mock data refresh by updating the key
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  }, []);

  // Toggle a team as favorite (with optimistic updates and rollback)
  const handleToggleFavorite = async (teamName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to event detail
    const teamId = teamName.toLowerCase().replace(/\s+/g, '-');

    if (addingFavorite) return; // Prevent double-clicks
    setAddingFavorite(teamId);
    setFavoriteError(null);

    const wasInFavorites = favoriteTeams.has(teamId);

    try {
      if (wasInFavorites) {
        // OPTIMISTIC UPDATE: Remove immediately from UI
        setFavoriteTeams(prev => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });

        // Then try API call
        const response = await api.get('/v1/favorites');
        const favorites = response.data.favorites || [];
        const favorite = favorites.find((f: { entityType: string; entityId: string }) =>
          f.entityType === 'team' && f.entityId === teamId
        );
        if (favorite) {
          await api.delete(`/v1/favorites/${favorite.id}`);
        }
      } else {
        // OPTIMISTIC UPDATE: Add immediately to UI
        setFavoriteTeams(prev => new Set(prev).add(teamId));
        setFavoriteSuccess(teamId);
        setTimeout(() => setFavoriteSuccess(null), 2000);

        // Then try API call
        await api.post('/v1/favorites', {
          entityType: 'team',
          entityId: teamId,
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // ROLLBACK: Revert the optimistic update on error
      if (wasInFavorites) {
        // Was in favorites, we removed it, but API failed - add it back
        setFavoriteTeams(prev => new Set(prev).add(teamId));
      } else {
        // Was not in favorites, we added it, but API failed - remove it
        setFavoriteTeams(prev => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });
        setFavoriteSuccess(null); // Clear success animation
      }
      // Show error message
      setFavoriteError(`Failed to ${wasInFavorites ? 'remove' : 'add'} favorite. Please try again.`);
      setTimeout(() => setFavoriteError(null), 3000);
    } finally {
      setAddingFavorite(null);
    }
  };

  const sport = sportKey ? sportsData[sportKey] : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mockEventsBySport = useMemo(() => getMockEventsBySport(), [refreshKey]);
  const allEvents = sportKey ? mockEventsBySport[sportKey] || [] : [];

  // Get unique leagues for filter
  const leagues = useMemo(() => {
    const uniqueLeagues = [...new Set(allEvents.map(e => e.league))];
    return uniqueLeagues.sort();
  }, [allEvents]);

  // Filter events by league, time window, status, and odds
  const filteredEvents = useMemo(() => {
    let events = allEvents;

    // Filter by league
    if (leagueFilter !== 'all') {
      events = events.filter(e => e.league === leagueFilter);
    }

    // Filter by status (Live/Upcoming)
    if (statusFilter === 'live') {
      events = events.filter(e => isEventLive(e.startDate));
    } else if (statusFilter === 'upcoming') {
      events = events.filter(e => isEventUpcoming(e.startDate));
    }

    // Filter by time window
    if (timeFilter !== 'all') {
      const now = new Date();
      const timeOption = timeWindowOptions.find(opt => opt.value === timeFilter);

      if (timeFilter === 'custom' && startDateParam && endDateParam) {
        // Custom date range filter
        const startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        events = events.filter(e => e.startDate >= startDate && e.startDate <= endDate);
      } else if (timeOption && timeOption.hours) {
        const cutoffTime = new Date(now.getTime() + timeOption.hours * 60 * 60 * 1000);
        events = events.filter(e => e.startDate >= now && e.startDate <= cutoffTime);
      }
    }

    // Filter by min/max odds (check if any odds fall within range)
    if (minOddsFilter > 1.01 || maxOddsFilter < 100) {
      events = events.filter(e => {
        const allOdds = [e.homeOdds, e.awayOdds, e.drawOdds].filter(Boolean) as number[];
        return allOdds.some(odds => odds >= minOddsFilter && odds <= maxOddsFilter);
      });
    }

    return events;
  }, [allEvents, leagueFilter, timeFilter, statusFilter, minOddsFilter, maxOddsFilter, startDateParam, endDateParam]);

  // Paginate events
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PER_PAGE;
    return filteredEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  // Update URL params
  const setLeague = (league: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (league === 'all') {
      newParams.delete('league');
    } else {
      newParams.set('league', league);
    }
    newParams.set('page', '1'); // Reset to page 1 when filter changes
    setSearchParams(newParams);
  };

  const setTimeWindow = (time: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (time === 'all') {
      newParams.delete('time');
      newParams.delete('startDate');
      newParams.delete('endDate');
    } else if (time === 'custom') {
      // Open date picker modal instead of immediately setting filter
      setShowDatePicker(true);
      return;
    } else {
      newParams.set('time', time);
      newParams.delete('startDate');
      newParams.delete('endDate');
    }
    newParams.set('page', '1'); // Reset to page 1 when filter changes
    setSearchParams(newParams);
  };

  // Validate date input
  const validateDate = (dateStr: string): { valid: boolean; error?: string } => {
    if (!dateStr) {
      return { valid: false, error: 'Date is required' };
    }

    // Check if the format is valid (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }

    return { valid: true };
  };

  // Validate start date (must not be in the past)
  const validateStartDate = (dateStr: string): { valid: boolean; error?: string } => {
    const baseValidation = validateDate(dateStr);
    if (!baseValidation.valid) return baseValidation;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(dateStr);

    if (inputDate < today) {
      return { valid: false, error: 'Start date cannot be in the past' };
    }

    return { valid: true };
  };

  // Validate end date (must not be before start date)
  const validateEndDate = (dateStr: string, startDateStr: string): { valid: boolean; error?: string } => {
    const baseValidation = validateDate(dateStr);
    if (!baseValidation.valid) return baseValidation;

    if (startDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(dateStr);
      if (endDate < startDate) {
        return { valid: false, error: 'End date cannot be before start date' };
      }
    }

    return { valid: true };
  };

  // Handle start date change with validation
  const handleStartDateChange = (value: string) => {
    setCustomStartDate(value);
    const validation = validateStartDate(value);
    if (!validation.valid) {
      setDateErrors(prev => ({ ...prev, start: validation.error }));
    } else {
      setDateErrors(prev => ({ ...prev, start: undefined }));
      // Re-validate end date if it exists
      if (customEndDate) {
        const endValidation = validateEndDate(customEndDate, value);
        setDateErrors(prev => ({ ...prev, end: endValidation.valid ? undefined : endValidation.error }));
      }
    }
  };

  // Handle end date change with validation
  const handleEndDateChange = (value: string) => {
    setCustomEndDate(value);
    const validation = validateEndDate(value, customStartDate);
    if (!validation.valid) {
      setDateErrors(prev => ({ ...prev, end: validation.error }));
    } else {
      setDateErrors(prev => ({ ...prev, end: undefined }));
    }
  };

  const applyCustomDateRange = () => {
    // Validate both dates before applying
    const startValidation = validateStartDate(customStartDate);
    const endValidation = validateEndDate(customEndDate, customStartDate);

    if (!startValidation.valid || !endValidation.valid) {
      setDateErrors({
        start: startValidation.valid ? undefined : startValidation.error,
        end: endValidation.valid ? undefined : endValidation.error,
      });
      return;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set('time', 'custom');
    newParams.set('startDate', customStartDate);
    newParams.set('endDate', customEndDate);
    newParams.set('page', '1');
    setSearchParams(newParams);
    setShowDatePicker(false);
    setDateErrors({});
  };

  const cancelDatePicker = () => {
    setShowDatePicker(false);
    setCustomStartDate(startDateParam || '');
    setCustomEndDate(endDateParam || '');
    setDateErrors({});
  };

  const setStatus = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    newParams.set('page', '1'); // Reset to page 1 when filter changes
    setSearchParams(newParams);
  };

  const setPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  const setOddsRange = (minOdds: number, maxOdds: number) => {
    // Clamp values to valid range (1.01 to 100)
    const clampedMin = Math.max(1.01, Math.min(100, minOdds));
    const clampedMax = Math.max(1.01, Math.min(100, maxOdds));

    const newParams = new URLSearchParams(searchParams);
    if (clampedMin <= 1.01) {
      newParams.delete('minOdds');
    } else {
      newParams.set('minOdds', clampedMin.toString());
    }
    if (clampedMax >= 100) {
      newParams.delete('maxOdds');
    } else {
      newParams.set('maxOdds', clampedMax.toString());
    }
    newParams.set('page', '1'); // Reset to page 1 when filter changes
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Check if any filters are active
  const hasActiveFilters = leagueFilter !== 'all' || timeFilter !== 'all' || statusFilter !== 'all' || minOddsFilter > 1.01 || maxOddsFilter < 100 || (startDateParam && endDateParam);

  // Build current filters object for saving as preset
  const getCurrentFilters = () => {
    const filters: Record<string, string | number> = {
      sport: sportKey || 'soccer',
    };
    if (leagueFilter !== 'all') filters.league = leagueFilter;
    if (timeFilter !== 'all') filters.time = timeFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (minOddsFilter > 1.01) filters.minOdds = minOddsFilter;
    if (maxOddsFilter < 100) filters.maxOdds = maxOddsFilter;
    return filters;
  };

  const handleSavePreset = async () => {
    const trimmedName = presetName.trim();
    setSaveError('');

    if (!trimmedName) {
      setSaveError('Please enter a preset name');
      return;
    }

    if (trimmedName.length < 3) {
      setSaveError('Preset name must be at least 3 characters');
      return;
    }

    if (trimmedName.length > 100) {
      setSaveError('Preset name must be 100 characters or less');
      return;
    }

    setSavingPreset(true);
    try {
      const filters = getCurrentFilters();
      await api.post('/v1/presets', {
        name: trimmedName,
        filters: JSON.stringify(filters),
        sportId: sportKey,
        isPinned: false,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setShowSavePreset(false);
        setPresetName('');
        setSaveSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to save preset:', error);
      setSaveError('Failed to save preset. Please try again.');
    } finally {
      setSavingPreset(false);
    }
  };

  if (!sport) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl text-white">Sport not found</h1>
          <button
            onClick={() => navigate('/sports')}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Back to Sports Hub
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link to="/home" className="text-gray-400 hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li className="text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li>
              <Link to="/sports" className="text-gray-400 hover:text-white transition-colors">
                Sports Hub
              </Link>
            </li>
            <li className="text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium">
              {sport.name}
            </li>
          </ol>
        </nav>

        {/* Favorite Error Toast */}
        {favoriteError && (
          <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in" role="alert">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{favoriteError}</span>
            <button
              onClick={() => setFavoriteError(null)}
              className="ml-2 text-white/80 hover:text-white"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{sport.icon}</span>
              <div>
                <h1 className="text-3xl font-bold text-white">{sport.name} Events</h1>
                <p className="text-gray-400 mt-1" data-testid="filter-results-count">
                  {filteredEvents.length} {leagueFilter !== 'all' ? `${leagueFilter} ` : ''}events
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Save as Preset Button */}
              {hasActiveFilters && (
                <button
                  onClick={() => setShowSavePreset(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                  aria-label="Save filters as preset"
                  data-testid="save-preset-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save Preset</span>
                </button>
              )}
              {/* Sport Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                aria-label={`${sport.name} Settings`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">{sport.name} Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live/Upcoming Toggle */}
        <div className="mb-4">
          <div className="text-gray-400 text-sm mb-2">Event Status</div>
          <div className="inline-flex rounded-lg bg-gray-700 p-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? option.value === 'live'
                      ? 'bg-red-500 text-white'
                      : option.value === 'upcoming'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-green-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {option.value === 'live' && (
                  <span className="mr-1.5 inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Window Filter */}
        <div className="mb-4">
          <div className="text-gray-400 text-sm mb-2">Time Window</div>
          <div className="flex flex-wrap gap-2">
            {timeWindowOptions.map((option) => {
              // Show custom date label when custom filter is active
              const isCustomActive = option.value === 'custom' && timeFilter === 'custom' && startDateParam && endDateParam;
              const buttonLabel = isCustomActive
                ? `${new Date(startDateParam).toLocaleDateString()} - ${new Date(endDateParam).toLocaleDateString()}`
                : option.label;

              return (
                <button
                  key={option.value}
                  onClick={() => setTimeWindow(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeFilter === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  data-testid={option.value === 'custom' ? 'custom-date-filter-button' : undefined}
                >
                  {buttonLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* League Filter */}
        {leagues.length > 1 && (
          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-2">League</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLeague('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  leagueFilter === 'all'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Leagues
              </button>
              {leagues.map((league) => (
                <button
                  key={league}
                  onClick={() => setLeague(league)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    leagueFilter === league
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {league}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Odds Range Filter */}
        <div className="mb-4">
          <div className="text-gray-400 text-sm mb-2">Odds Range</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Min:</span>
              <input
                type="number"
                min="1.01"
                max="100"
                step="0.1"
                value={minOddsFilter}
                onChange={(e) => setOddsRange(parseFloat(e.target.value) || 1.01, maxOddsFilter)}
                className={`w-20 px-2 py-1 bg-gray-700 border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${minOddsFilter > maxOddsFilter ? 'border-red-500' : 'border-gray-600'}`}
                data-testid="min-odds-filter"
              />
            </div>
            <span className="text-gray-500">-</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Max:</span>
              <input
                type="number"
                min="1.01"
                max="100"
                step="0.1"
                value={maxOddsFilter}
                onChange={(e) => setOddsRange(minOddsFilter, parseFloat(e.target.value) || 100)}
                className={`w-20 px-2 py-1 bg-gray-700 border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${minOddsFilter > maxOddsFilter ? 'border-red-500' : 'border-gray-600'}`}
                data-testid="max-odds-filter"
              />
            </div>
          </div>
          {minOddsFilter > maxOddsFilter && (
            <div
              className="mt-2 text-sm text-red-400 flex items-center gap-1"
              data-testid="odds-range-error"
              role="alert"
              aria-live="polite"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Min odds must be less than or equal to max odds
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mb-6">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium flex items-center gap-2"
              data-testid="clear-filters-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          </div>
        )}

        {/* Events List */}
        {paginatedEvents.length > 0 ? (
          <div className="space-y-4">
            {paginatedEvents.map((event) => {
              const eventId = `${sportKey}-${event.id}`;
              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${eventId}`)}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 hover:bg-gray-800/80 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                        {isEventLive(event.startDate) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold">
                            <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />
                            LIVE
                          </span>
                        )}
                        <span>{event.league} &bull; {formatEventTimeWithTimezone(event.startDate, timezone)}</span>
                      </div>
                      <div className="text-white text-lg font-medium flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          {event.homeTeam}
                          <button
                            onClick={(e) => handleToggleFavorite(event.homeTeam, e)}
                            className={`p-1 rounded transition-colors ${
                              favoriteTeams.has(event.homeTeam.toLowerCase().replace(/\s+/g, '-'))
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-gray-500 hover:text-yellow-400'
                            }`}
                            title={favoriteTeams.has(event.homeTeam.toLowerCase().replace(/\s+/g, '-')) ? 'Remove from favorites' : 'Add to favorites'}
                            data-testid={`favorite-${event.homeTeam.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {addingFavorite === event.homeTeam.toLowerCase().replace(/\s+/g, '-') ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill={favoriteTeams.has(event.homeTeam.toLowerCase().replace(/\s+/g, '-')) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                          {favoriteSuccess === event.homeTeam.toLowerCase().replace(/\s+/g, '-') && (
                            <span className="text-xs text-green-400 animate-pulse">Added!</span>
                          )}
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span className="flex items-center gap-1">
                          {event.awayTeam}
                          <button
                            onClick={(e) => handleToggleFavorite(event.awayTeam, e)}
                            className={`p-1 rounded transition-colors ${
                              favoriteTeams.has(event.awayTeam.toLowerCase().replace(/\s+/g, '-'))
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-gray-500 hover:text-yellow-400'
                            }`}
                            title={favoriteTeams.has(event.awayTeam.toLowerCase().replace(/\s+/g, '-')) ? 'Remove from favorites' : 'Add to favorites'}
                            data-testid={`favorite-${event.awayTeam.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {addingFavorite === event.awayTeam.toLowerCase().replace(/\s+/g, '-') ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill={favoriteTeams.has(event.awayTeam.toLowerCase().replace(/\s+/g, '-')) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                          {favoriteSuccess === event.awayTeam.toLowerCase().replace(/\s+/g, '-') && (
                            <span className="text-xs text-green-400 animate-pulse">Added!</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Odds */}
                    <div className="flex gap-3">
                      <div className="bg-gray-700/50 rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <div className="text-gray-400 text-xs mb-1">Home</div>
                        <div className="text-green-400 font-semibold">{formatOdds(event.homeOdds, oddsFormat)}</div>
                      </div>
                      {event.drawOdds && (
                        <div className="bg-gray-700/50 rounded-lg px-4 py-3 text-center min-w-[80px]">
                          <div className="text-gray-400 text-xs mb-1">Draw</div>
                          <div className="text-yellow-400 font-semibold">{formatOdds(event.drawOdds, oddsFormat)}</div>
                        </div>
                      )}
                      <div className="bg-gray-700/50 rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <div className="text-gray-400 text-xs mb-1">Away</div>
                        <div className="text-blue-400 font-semibold">{formatOdds(event.awayOdds, oddsFormat)}</div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <div className="text-4xl mb-4">{sport.icon}</div>
            <h3 className="text-xl text-white mb-2">No events available</h3>
            <p className="text-gray-400">
              {leagueFilter !== 'all'
                ? `No ${leagueFilter} events found. Try a different filter.`
                : `Check back later for upcoming ${sport.name} events`
              }
            </p>
            {leagueFilter !== 'all' && (
              <button
                onClick={() => setLeague('all')}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Show All Events
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Sport Settings Modal */}
        {showSettings && (
          <SportSettingsModal
            sport={sport}
            leagues={leagues}
            settings={sportSettings}
            onSave={(newSettings) => {
              setSportSettings(newSettings);
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Save Preset Modal */}
        {showSavePreset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => {
                setShowSavePreset(false);
                setPresetName('');
                setSaveError('');
              }}
            />
            <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
              {saveSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Preset Saved!</h3>
                  <p className="text-gray-400 mt-2">Your filter preset has been saved successfully.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-white mb-4">Save Filters as Preset</h3>

                  {/* Current filters preview */}
                  <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Current filters:</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                        Sport: {sport.name}
                      </span>
                      {leagueFilter !== 'all' && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                          League: {leagueFilter}
                        </span>
                      )}
                      {timeFilter !== 'all' && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                          Time: {timeFilter}
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                          Status: {statusFilter}
                        </span>
                      )}
                      {minOddsFilter > 1.01 && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                          Min Odds: {minOddsFilter}
                        </span>
                      )}
                      {maxOddsFilter < 100 && (
                        <span className="px-2 py-1 bg-gray-600 rounded text-xs text-white">
                          Max Odds: {maxOddsFilter}
                        </span>
                      )}
                    </div>
                  </div>

                  {saveError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {saveError}
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">Preset Name</label>
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => {
                        setPresetName(e.target.value);
                        setSaveError('');
                      }}
                      placeholder="e.g., Premier League Live Games"
                      maxLength={100}
                      className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 ${saveError ? 'border-red-500' : 'border-gray-600'}`}
                      data-testid="preset-name-input"
                      autoFocus
                    />
                    <p className="text-gray-500 text-xs mt-1">{presetName.trim().length}/100 characters (min 3)</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSavePreset(false);
                        setPresetName('');
                        setSaveError('');
                      }}
                      className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePreset}
                      disabled={!presetName.trim() || savingPreset}
                      className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="confirm-save-preset"
                    >
                      {savingPreset ? 'Saving...' : 'Save Preset'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Custom Date Range Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={cancelDatePicker}
            />
            <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Select Date Range</h3>
              <p className="text-gray-400 text-sm mb-6">Filter events within a custom date range.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                      dateErrors.start
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-600 focus:border-green-500'
                    }`}
                    data-testid="custom-start-date"
                  />
                  {dateErrors.start && (
                    <p className="text-red-400 text-sm mt-1" data-testid="start-date-error">
                      {dateErrors.start}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={customStartDate || new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                      dateErrors.end
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-600 focus:border-green-500'
                    }`}
                    data-testid="custom-end-date"
                  />
                  {dateErrors.end && (
                    <p className="text-red-400 text-sm mt-1" data-testid="end-date-error">
                      {dateErrors.end}
                    </p>
                  )}
                </div>

                {/* Date range preview */}
                {customStartDate && customEndDate && !dateErrors.start && !dateErrors.end && (
                  <div className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-400">
                      Filtering events from{' '}
                      <span className="text-white font-medium">
                        {new Date(customStartDate).toLocaleDateString()}
                      </span>{' '}
                      to{' '}
                      <span className="text-white font-medium">
                        {new Date(customEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelDatePicker}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCustomDateRange}
                  disabled={!customStartDate || !customEndDate || !!dateErrors.start || !!dateErrors.end}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="apply-date-range"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}

// Sport Settings Modal Component
function SportSettingsModal({
  sport,
  leagues,
  settings,
  onSave,
  onClose,
}: {
  sport: { name: string; icon: string; color: string };
  leagues: string[];
  settings: SportSettings;
  onSave: (settings: SportSettings) => void;
  onClose: () => void;
}) {
  const [localSettings, setLocalSettings] = useState<SportSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  const toggleFavoriteLeague = (league: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      favoriteLeagues: prev.favoriteLeagues.includes(league)
        ? prev.favoriteLeagues.filter((l) => l !== league)
        : [...prev.favoriteLeagues, league],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sport.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">{sport.name} Settings</h2>
              <p className="text-gray-400 text-sm">Customize your {sport.name.toLowerCase()} experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Odds Display Format */}
          <div>
            <label className="block text-white font-medium mb-2">Default Odds Format</label>
            <select
              value={localSettings.defaultOddsDisplay}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultOddsDisplay: e.target.value as 'decimal' | 'american' | 'fractional',
                }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="decimal">Decimal (2.50)</option>
              <option value="american">American (+150)</option>
              <option value="fractional">Fractional (3/2)</option>
            </select>
          </div>

          {/* Show Live Only Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Show Live Events Only</div>
              <div className="text-gray-400 text-sm">Only display events currently in-play</div>
            </div>
            <button
              onClick={() =>
                setLocalSettings((prev) => ({ ...prev, showLiveOnly: !prev.showLiveOnly }))
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.showLiveOnly ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.showLiveOnly ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Odds Range */}
          <div>
            <label className="block text-white font-medium mb-2">Odds Range Filter</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-gray-400 text-sm mb-1">Min Odds</label>
                <input
                  type="number"
                  min="1.01"
                  max="100"
                  step="0.01"
                  value={localSettings.minOdds}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      minOdds: parseFloat(e.target.value) || 1.01,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-gray-400 text-sm mb-1">Max Odds</label>
                <input
                  type="number"
                  min="1.01"
                  max="100"
                  step="0.01"
                  value={localSettings.maxOdds}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      maxOdds: parseFloat(e.target.value) || 100,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Favorite Leagues */}
          {leagues.length > 0 && (
            <div>
              <label className="block text-white font-medium mb-2">Favorite Leagues</label>
              <p className="text-gray-400 text-sm mb-3">Select leagues to prioritize in your feed</p>
              <div className="flex flex-wrap gap-2">
                {leagues.map((league) => (
                  <button
                    key={league}
                    onClick={() => toggleFavoriteLeague(league)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      localSettings.favoriteLeagues.includes(league)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {localSettings.favoriteLeagues.includes(league) && (
                      <span className="mr-1">✓</span>
                    )}
                    {league}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
