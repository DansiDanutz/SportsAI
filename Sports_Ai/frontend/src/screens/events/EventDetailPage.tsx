import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useSwipe } from '../../hooks/useSwipe';
import { eventsApi, StandingsResponse, Event } from '../../services/api';
import { useBetSlipStore } from '../../store/betSlipStore';

// Sport key mapping for breadcrumbs
const sportKeyMap: Record<string, string> = {
  soccer: 'Soccer',
  basketball: 'Basketball',
  tennis: 'Tennis',
  baseball: 'Baseball',
  american_football: 'American Football',
  ice_hockey: 'Ice Hockey',
  cricket: 'Cricket',
  rugby: 'Rugby',
  mma: 'MMA / UFC',
  esports: 'eSports',
};

// Helper function to get sport icon
function getSportIcon(sportKey: string): string {
  const icons: Record<string, string> = {
    soccer: '⚽',
    basketball: '🏀',
    tennis: '🎾',
    baseball: '⚾',
    american_football: '🏈',
    ice_hockey: '🏒',
    cricket: '🏏',
    rugby: '🏉',
    mma: '🥊',
    esports: '🎮',
  };
  return icons[sportKey] || '🏆';
}

// Helper function to format start time
function formatStartTime(startTime: string): string {
  if (!startTime) return 'TBD';
  const date = new Date(startTime);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
}

// Helper function to calculate countdown to event
function getCountdown(startTime: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isPast: boolean;
} | null {
  if (!startTime) return null;
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    // Event has started or is past
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: diffMs > -3600000, isPast: diffMs <= -3600000 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isLive: false, isPast: false };
}

// Format countdown display
function formatCountdown(countdown: ReturnType<typeof getCountdown>): string {
  if (!countdown) return '';
  if (countdown.isLive) return 'LIVE NOW';
  if (countdown.isPast) return 'Finished';

  const parts: string[] = [];
  if (countdown.days > 0) parts.push(`${countdown.days}d`);
  if (countdown.hours > 0 || countdown.days > 0) parts.push(`${countdown.hours}h`);
  if (countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) parts.push(`${countdown.minutes}m`);
  parts.push(`${countdown.seconds}s`);

  return parts.join(' ');
}

type OddsQuote = {
  id?: string;
  bookmaker?: string;
  market?: string;
  outcomeKey?: string;
  odds?: number;
  line?: number | null;
};

type EventDetailModel = {
  id: string;
  sport: string;
  sportIcon: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  venue: string;
  rawStartTime?: string;
  odds: OddsQuote[];
};

// Local fixtures removed: this screen renders API data only.
/*
  'soccer-1': {
    id: 'soccer-1',
    sport: 'Soccer',
    sportIcon: '⚽',
    homeTeam: 'Liverpool FC',
    awayTeam: 'Manchester United',
    league: 'Premier League',
    startTime: 'Tomorrow 15:00',
    rawStartTime: getFutureDate(24), // 24 hours from now
    venue: 'Anfield, Liverpool',
    homeOdds: 1.75,
    drawOdds: 3.40,
    awayOdds: 4.20,
    markets: [
      {
        name: 'Match Result',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Liverpool FC', odds: 1.75 },
          { name: 'Draw', odds: 3.40 },
          { name: 'Manchester United', odds: 4.20 },
        ],
      },
      {
        name: 'Over/Under 2.5 Goals',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Over 2.5', odds: 1.85 },
          { name: 'Under 2.5', odds: 1.95 },
        ],
      },
      {
        name: 'Both Teams to Score',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Betfair'],
        selections: [
          { name: 'Yes', odds: 1.70 },
          { name: 'No', odds: 2.10 },
        ],
      },
      {
        name: 'First Goal Scorer',
        bookmakerCount: 2,
        availability: 'low',
        bookmakers: ['Bet365', 'Betfair'],
        selections: [
          { name: 'Mohamed Salah', odds: 4.50 },
          { name: 'Marcus Rashford', odds: 6.00 },
          { name: 'Bruno Fernandes', odds: 7.50 },
        ],
      },
      {
        name: 'Correct Score',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Betfair'],
        selections: [
          { name: '1-0', odds: 7.00 },
          { name: '2-1', odds: 8.50 },
          { name: '3-1', odds: 13.00 },
          { name: '2-0', odds: 9.00 },
        ],
      },
      {
        name: 'Asian Handicap',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Liverpool -0.5', odds: 1.85 },
          { name: 'Manchester United +0.5', odds: 2.05 },
        ],
      },
      {
        name: 'Half-Time/Full-Time',
        bookmakerCount: 2,
        availability: 'low',
        bookmakers: ['Bet365', 'Betfair'],
        selections: [
          { name: 'Liverpool/Liverpool', odds: 2.20 },
          { name: 'Draw/Liverpool', odds: 5.50 },
          { name: 'Liverpool/Draw', odds: 12.00 },
        ],
      },
      {
        name: 'Total Corners',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Unibet'],
        selections: [
          { name: 'Over 9.5', odds: 1.85 },
          { name: 'Under 9.5', odds: 1.95 },
        ],
      },
      {
        name: 'Total Cards',
        bookmakerCount: 2,
        availability: 'low',
        bookmakers: ['Bet365', 'Betfair'],
        selections: [
          { name: 'Over 3.5', odds: 1.90 },
          { name: 'Under 3.5', odds: 1.90 },
        ],
      },
      {
        name: 'Player Props - Goals',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Betfair'],
        selections: [
          { name: 'Salah to Score', odds: 2.50 },
          { name: 'Nunez to Score', odds: 3.20 },
          { name: 'Rashford to Score', odds: 4.00 },
        ],
      },
    ],
  },
  'soccer-2': {
    id: 'soccer-2',
    sport: 'Soccer',
    sportIcon: '⚽',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    league: 'La Liga',
    startTime: 'Saturday 21:00',
    rawStartTime: getFutureDate(48), // 48 hours from now
    venue: 'Santiago Bernabeu, Madrid',
    homeOdds: 2.10,
    drawOdds: 3.20,
    awayOdds: 3.50,
    markets: [
      {
        name: 'Match Result',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Real Madrid', odds: 2.10 },
          { name: 'Draw', odds: 3.20 },
          { name: 'Barcelona', odds: 3.50 },
        ],
      },
      {
        name: 'Over/Under 2.5 Goals',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Betfair'],
        selections: [
          { name: 'Over 2.5', odds: 1.65 },
          { name: 'Under 2.5', odds: 2.20 },
        ],
      },
    ],
  },
  'basketball-1': {
    id: 'basketball-1',
    sport: 'Basketball',
    sportIcon: '🏀',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Golden State Warriors',
    league: 'NBA',
    startTime: 'Tonight 20:30',
    rawStartTime: getFutureDate(6), // 6 hours from now
    venue: 'Crypto.com Arena, Los Angeles',
    homeOdds: 1.85,
    awayOdds: 1.95,
    markets: [
      {
        name: 'Moneyline',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Los Angeles Lakers', odds: 1.85 },
          { name: 'Golden State Warriors', odds: 1.95 },
        ],
      },
      {
        name: 'Total Points',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Over 225.5', odds: 1.90 },
          { name: 'Under 225.5', odds: 1.90 },
        ],
      },
      {
        name: 'Spread',
        bookmakerCount: 3,
        availability: 'medium',
        bookmakers: ['Bet365', 'William Hill', 'Betfair'],
        selections: [
          { name: 'Lakers -2.5', odds: 1.91 },
          { name: 'Warriors +2.5', odds: 1.91 },
        ],
      },
    ],
  },
  'tennis-1': {
    id: 'tennis-1',
    sport: 'Tennis',
    sportIcon: '🎾',
    homeTeam: 'Novak Djokovic',
    awayTeam: 'Carlos Alcaraz',
    league: 'ATP Finals',
    startTime: 'Today 14:00',
    rawStartTime: getFutureDate(2), // 2 hours from now
    venue: 'Pala Alpitour, Turin',
    homeOdds: 1.65,
    awayOdds: 2.20,
    markets: [
      {
        name: 'Match Winner',
        bookmakerCount: 4,
        availability: 'high',
        bookmakers: ['Bet365', 'William Hill', 'Betfair', 'Unibet'],
        selections: [
          { name: 'Novak Djokovic', odds: 1.65 },
          { name: 'Carlos Alcaraz', odds: 2.20 },
        ],
      },
      {
        name: 'Total Sets',
        bookmakerCount: 2,
        availability: 'low',
        bookmakers: ['Bet365', 'Betfair'],
        selections: [
          { name: 'Over 2.5 Sets', odds: 2.10 },
          { name: 'Under 2.5 Sets', odds: 1.70 },
        ],
      },
    ],
  },
*/

type TabType = 'odds' | 'markets' | 'stats' | 'news' | 'line-movement' | 'ai';

const tabs: { id: TabType; label: string }[] = [
  { id: 'odds', label: 'Odds' },
  { id: 'markets', label: 'Markets' },
  { id: 'stats', label: 'Stats' },
  { id: 'news', label: 'News' },
  { id: 'line-movement', label: 'Line Movement' },
  { id: 'ai', label: 'AI' },
];

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('odds');
  const [apiEvent, setApiEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown>>(null);

  // Extract the actual event ID from composite ID (e.g., "soccer-6" -> "6")
  const actualEventId = eventId?.includes('-') ? eventId.split('-').slice(1).join('-') : eventId;
  const sportKey = eventId?.split('-')[0] || '';

  // Handle hash navigation for tabs (e.g., /event/123#stats)
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      const validTabs = tabs.map(t => t.id);
      if (validTabs.includes(hash as TabType)) {
        setActiveTab(hash as TabType);
      }
    }
  }, [location.hash]);

  // Fetch event from API
  useEffect(() => {
    const fetchEvent = async () => {
      if (!actualEventId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await eventsApi.getById(actualEventId);
        setApiEvent(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [actualEventId]);

  // Countdown uses backend startTime only
  const rawStartTime = apiEvent?.startTime;

  // Live countdown timer - updates every second
  useEffect(() => {
    if (!rawStartTime) {
      setCountdown(null);
      return;
    }

    // Initial countdown calculation
    setCountdown(getCountdown(rawStartTime));

    // Update countdown every second
    const interval = setInterval(() => {
      setCountdown(getCountdown(rawStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [rawStartTime]);

  // Swipe navigation for tabs
  const handleSwipeLeft = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  }, [activeTab]);

  const handleSwipeRight = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  }, [activeTab]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
  });

  // Handle tab change with URL hash update
  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
    // Update URL hash without triggering navigation
    window.history.replaceState(null, '', `#${tabId}`);
  }, []);

  // Convert API event to a UI model (no fabricated odds)
  const event: EventDetailModel | null = apiEvent
    ? {
        id: apiEvent.id,
        sport: apiEvent.sport || sportKeyMap[sportKey] || 'Unknown',
        sportIcon: getSportIcon(sportKey),
        homeTeam: apiEvent.homeTeam || '—',
        awayTeam: apiEvent.awayTeam || '—',
        league: apiEvent.league || '—',
        startTime: formatStartTime(apiEvent.startTime),
        rawStartTime: apiEvent.startTime,
        venue: apiEvent.venue || '—',
        odds: (apiEvent as any)?.odds || [],
      }
    : null;

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl text-white mb-4">Event not found</h1>
          <p className="text-gray-400 mb-6">The event you're looking for doesn't exist or has ended.</p>
          <button
            onClick={() => navigate('/sports')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Browse Sports
          </button>
        </div>
      </Layout>
    );
  }

  // Get sport name from key
  const sportName = sportKeyMap[sportKey] || sportKey;

  return (
    <Layout>
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
            <li>
              <Link to={`/sports/${sportKey}`} className="text-gray-400 hover:text-white transition-colors">
                {sportName}
              </Link>
            </li>
            <li className="text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium">
              Event Detail
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 relative">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
              <span>{event.sportIcon}</span>
              <span>{event.sport}</span>
              <span>•</span>
              <span>{event.league}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Teams */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {event.homeTeam} vs {event.awayTeam}
                </h1>
                <div className="flex flex-wrap gap-4 text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {event.startTime}
                  </div>
                  {/* Live Countdown Timer */}
                  {countdown && (
                    <div className={`flex items-center gap-2 font-mono ${
                      countdown.isLive
                        ? 'text-red-400 animate-pulse'
                        : countdown.isPast
                          ? 'text-gray-500'
                          : 'text-green-400'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-semibold">
                        {formatCountdown(countdown)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.venue}
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <div className="flex items-center gap-2 md:absolute md:top-6 md:right-6">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.share) {
                      navigator.share({
                        title: `${event.homeTeam} vs ${event.awayTeam}`,
                        text: `Check out this ${event.sport} match: ${event.homeTeam} vs ${event.awayTeam}`,
                        url,
                      });
                    } else {
                      navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label="Share event"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Odds availability */}
              <div className="text-sm text-gray-400">
                {event.odds.length > 0 ? `${event.odds.length} odds quotes available` : 'No odds available for this event yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-green-500 border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - with swipe gesture support */}
        <div
          className="space-y-6 touch-pan-y"
          {...swipeHandlers}
        >
          {activeTab === 'odds' && <OddsTab event={event} />}
          {activeTab === 'markets' && <MarketsTab event={event} />}
          {activeTab === 'stats' && <StatsTab event={event} />}
          {activeTab === 'news' && <NewsTab event={event} />}
          {activeTab === 'line-movement' && <LineMovementTab event={event} />}
          {activeTab === 'ai' && <AITab event={event} />}
        </div>
      </div>
    </Layout>
  );
}


// Odds Tab (real API data only)
function OddsTab({ event }: { event: EventDetailModel }) {
  const { addSelection, hasSelection } = useBetSlipStore();
  const quotes = event.odds || [];

  const byMarket = quotes.reduce<Record<string, OddsQuote[]>>((acc, q) => {
    const market = q.market || 'Unknown market';
    (acc[market] ||= []).push(q);
    return acc;
  }, {});

  const markets = Object.entries(byMarket);

  if (markets.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Odds</h2>
        <p className="text-gray-400">No odds available for this event yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Odds</h2>
      {markets.map(([marketName, qs]) => (
        <div key={marketName} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{marketName}</h3>
            <span className="text-sm text-gray-400">{qs.length} quotes</span>
          </div>
          <div className="space-y-2">
            {qs.map((q) => {
              const selId = `${event.id}-${marketName}-${q.outcomeKey}-${q.bookmaker}`;
              const isSelected = hasSelection(selId);
              return (
              <button
                key={q.id || `${q.bookmaker}-${q.outcomeKey}-${q.line}-${q.odds}`}
                onClick={() => typeof q.odds === 'number' && addSelection({
                  id: selId,
                  eventId: event.id,
                  eventName: `${event.homeTeam} vs ${event.awayTeam}`,
                  market: marketName,
                  pick: q.outcomeKey || '—',
                  odds: q.odds,
                  bookmaker: q.bookmaker,
                })}
                className={`w-full flex items-center justify-between rounded-lg px-4 py-3 transition-all text-left ${
                  isSelected
                    ? 'bg-green-600/20 border border-green-500/40 ring-1 ring-green-500/30'
                    : 'bg-gray-700/30 hover:bg-gray-700/60 border border-transparent'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-white font-medium truncate flex items-center gap-2">
                    {q.outcomeKey || '—'}
                    {isSelected && <span className="text-green-400 text-[10px] font-bold">✓ IN SLIP</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{q.bookmaker || 'Unknown bookmaker'}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${isSelected ? 'text-green-300' : 'text-green-400'}`}>
                    {typeof q.odds === 'number' ? q.odds.toFixed(2) : '—'}
                  </div>
                  {q.line !== null && q.line !== undefined && (
                    <div className="text-xs text-gray-400">Line: {q.line}</div>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Markets & Periods Tab
function MarketsTab({ event }: { event: EventDetailModel }) {
  const quotes = event.odds || [];
  const byMarket = quotes.reduce<Record<string, number>>((acc, q) => {
    const market = q.market || 'Unknown market';
    acc[market] = (acc[market] || 0) + 1;
    return acc;
  }, {});

  const markets = Object.entries(byMarket).sort((a, b) => b[1] - a[1]);

  if (markets.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Markets</h2>
        <p className="text-gray-400">No markets available for this event yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Markets</h2>
      <div className="space-y-2">
        {markets.map(([name, count]) => (
          <div key={name} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-4 py-3">
            <div className="text-white">{name}</div>
            <div className="text-sm text-gray-400">{count} quotes</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats & History Tab
function StatsTab({ event }: { event: EventDetailModel }) {
  const [standingsData, setStandingsData] = useState<StandingsResponse | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const data = await eventsApi.getStandings(event.id);
        setStandingsData(data);
      } catch (error) {
        console.error('Failed to fetch standings:', error);
      } finally {
        setLoadingStandings(false);
      }
    };
    fetchStandings();
  }, [event.id]);

  // Format update time
  const formatUpdateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Not available';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Updated just now';
    if (diffHours === 1) return 'Updated 1 hour ago';
    if (diffHours < 24) return `Updated ${diffHours} hours ago`;
    return `Updated on ${date.toLocaleDateString()}`;
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Stats & History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Head to Head */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-white mb-2">H2H Data Unavailable</h3>
          <p className="text-gray-400 text-sm">
            Head-to-head statistics require a premium data provider connection.
          </p>
        </div>

        {/* Recent Form */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center py-12">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-white mb-2">Form Data Unavailable</h3>
          <p className="text-gray-400 text-sm">
            Recent form history requires a professional data subscription.
          </p>
        </div>
      </div>

      {/* League Standings */}
      <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">
            {standingsData?.leagueName || event.league} Standings
            {standingsData?.season && <span className="text-sm text-gray-400 ml-2">({standingsData.season})</span>}
          </h3>
          <span className="text-xs text-gray-500" data-testid="standings-update-date">
            {formatUpdateTime(standingsData?.updatedAt || null)}
          </span>
        </div>
        {loadingStandings ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : standingsData?.standings && standingsData.standings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="standings-table">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left py-3 px-2">#</th>
                  <th className="text-left py-3 px-2">Team</th>
                  <th className="text-center py-3 px-2">P</th>
                  <th className="text-center py-3 px-2">W</th>
                  <th className="text-center py-3 px-2">D</th>
                  <th className="text-center py-3 px-2">L</th>
                  <th className="text-center py-3 px-2">GF</th>
                  <th className="text-center py-3 px-2">GA</th>
                  <th className="text-center py-3 px-2">GD</th>
                  <th className="text-center py-3 px-2 font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standingsData.standings.map((row) => {
                  const isHomeTeam = row.teamName === event.homeTeam;
                  const isAwayTeam = row.teamName === event.awayTeam;
                  const isHighlighted = isHomeTeam || isAwayTeam;
                  return (
                    <tr
                      key={row.position}
                      className={`border-b border-gray-700/50 ${isHighlighted ? 'bg-green-500/10' : ''}`}
                      data-testid={`standings-row-${row.position}`}
                    >
                      <td className="py-3 px-2 text-gray-400" data-testid="position">{row.position}</td>
                      <td className={`py-3 px-2 ${isHighlighted ? 'text-green-400 font-medium' : 'text-white'}`} data-testid="team-name">
                        {row.teamName}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.played}</td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.won}</td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.drawn}</td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.lost}</td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.goalsFor}</td>
                      <td className="text-center py-3 px-2 text-gray-400">{row.goalsAgainst}</td>
                      <td className={`text-center py-3 px-2 ${row.goalDifference > 0 ? 'text-green-400' : row.goalDifference < 0 ? 'text-red-400' : 'text-gray-400'}`} data-testid="goal-difference">
                        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                      </td>
                      <td className="text-center py-3 px-2 text-white font-semibold" data-testid="points">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No standings data available for this league.</p>
          </div>
        )}
      </div>

      {/* Injuries Panel */}
      {/* We intentionally only show this panel if real data is available from an injury provider */}
      {/* (In this version, it's hidden to avoid displaying mock data) */}
    </div>
  );
}

// Injury Row Component
function InjuryRow({
  playerName,
  position,
  injuryType,
  expectedReturn,
  status
}: {
  playerName: string;
  position: string;
  injuryType: string;
  expectedReturn: string;
  status: 'out' | 'doubtful' | 'questionable';
}) {
  const statusColors = {
    out: 'bg-red-500/20 text-red-400',
    doubtful: 'bg-yellow-500/20 text-yellow-400',
    questionable: 'bg-orange-500/20 text-orange-400',
  };

  const statusLabels = {
    out: 'OUT',
    doubtful: 'DOUBTFUL',
    questionable: 'QUESTIONABLE',
  };

  return (
    <div className="flex items-start justify-between p-3 bg-gray-700/30 rounded-lg" data-testid="injury-row">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-white font-medium" data-testid="player-name">{playerName}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${statusColors[status]}`} data-testid="injury-status">
            {statusLabels[status]}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">{position}</div>
        <div className="text-sm text-gray-400 mt-1" data-testid="injury-type">{injuryType}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-500">Expected Return</div>
        <div className="text-sm text-gray-300" data-testid="expected-return">{expectedReturn}</div>
      </div>
    </div>
  );
}

// News & Context Tab
function NewsTab({ event: _event }: { event: EventDetailModel }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-2">News & Context</h2>
      <p className="text-gray-400">
        No news feed is connected for this event yet.
      </p>
      <p className="text-gray-500 text-sm mt-2">
        We intentionally do not display fabricated headlines.
      </p>
    </div>
  );
}

// Line Movement Tab
function LineMovementTab({ event: _event }: { event: EventDetailModel }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Line Movement</h2>
      <p className="text-gray-400">
        Line movement is not available yet (we don’t fabricate historical price charts).
      </p>
      <p className="text-gray-500 text-sm mt-2">
        Once we store real odds history per bookmaker, this tab will display it.
      </p>
    </div>
  );
}

// AI Insight Tab
function AITab({ event: _event }: { event: EventDetailModel }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-2">AI Insights</h2>
      <p className="text-gray-400">
        AI insights are not enabled for this event yet.
      </p>
      <p className="text-gray-500 text-sm mt-2">
        We intentionally do not display simulated predictions, win rates, or fabricated “key factors”.
      </p>
    </div>
  );
}
