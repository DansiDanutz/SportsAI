import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

const sports = [
  { key: 'soccer', name: 'Soccer', icon: '⚽', events: 156, color: 'bg-green-500' },
  { key: 'basketball', name: 'Basketball', icon: '🏀', events: 42, color: 'bg-orange-500' },
  { key: 'tennis', name: 'Tennis', icon: '🎾', events: 28, color: 'bg-yellow-500' },
  { key: 'baseball', name: 'Baseball', icon: '⚾', events: 18, color: 'bg-red-500' },
  { key: 'american_football', name: 'American Football', icon: '🏈', events: 12, color: 'bg-blue-500' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒', events: 24, color: 'bg-cyan-500' },
  { key: 'cricket', name: 'Cricket', icon: '🏏', events: 8, color: 'bg-emerald-500' },
  { key: 'rugby', name: 'Rugby', icon: '🏉', events: 6, color: 'bg-gray-500' },
  { key: 'mma', name: 'MMA / UFC', icon: '🥊', events: 4, color: 'bg-red-600' },
  { key: 'esports', name: 'eSports', icon: '🎮', events: 15, color: 'bg-purple-500' },
];

interface TeamSearchResult {
  id: string;
  name: string;
  league: string;
  sport: string;
  sportKey: string;
}

export function SportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['team-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { teams: [], total: 0 };
      }
      const response = await api.get<{ teams: TeamSearchResult[]; total: number }>(
        `/v1/events/teams/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
      );
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchOpen(true);
  };

  const handleTeamSelect = (team: TeamSearchResult) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    navigate(`/teams/${team.id}`);
  };

  const getSportIcon = (sportKey: string) => {
    const sport = sports.find((s) => s.key === sportKey);
    return sport?.icon || '🏆';
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Sports Hub</h1>
          <p className="text-gray-400 mt-2">
            Browse events by sport or search for teams
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative" ref={searchRef}>
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search for teams, leagues..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              data-testid="team-search-input"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && debouncedQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-400">
                  Searching...
                </div>
              ) : searchResults && searchResults.teams.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {searchResults.teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-gray-700/50 transition-colors text-left"
                      data-testid={`team-result-${team.id}`}
                    >
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                        {getSportIcon(team.sportKey)}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{team.name}</div>
                        <div className="text-sm text-gray-400">
                          {team.league} • {team.sport}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p>No teams found for "{debouncedQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sports Grid */}
        <SportGrid />

        {/* Popular Leagues */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">Popular Leagues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LeagueCard
              name="Premier League"
              sport="Soccer"
              country="England"
              events={10}
            />
            <LeagueCard
              name="NBA"
              sport="Basketball"
              country="USA"
              events={12}
            />
            <LeagueCard
              name="La Liga"
              sport="Soccer"
              country="Spain"
              events={10}
            />
            <LeagueCard
              name="Bundesliga"
              sport="Soccer"
              country="Germany"
              events={9}
            />
            <LeagueCard
              name="ATP Tour"
              sport="Tennis"
              country="International"
              events={8}
            />
            <LeagueCard
              name="NHL"
              sport="Ice Hockey"
              country="USA/Canada"
              events={15}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SportGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {sports.map((sport) => (
        <button
          key={sport.key}
          onClick={() => navigate(`/sports/${sport.key}`)}
          className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 hover:bg-gray-800/80 transition-colors text-center"
        >
          <div className="text-4xl mb-3">{sport.icon}</div>
          <div className="text-white font-medium">{sport.name}</div>
          <div className="text-gray-400 text-sm mt-1">{sport.events} events</div>
        </button>
      ))}
    </div>
  );
}

interface LeagueCardProps {
  name: string;
  sport: string;
  country: string;
  events: number;
}

function LeagueCard({ name, sport, country, events }: LeagueCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors cursor-pointer">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 font-bold text-sm">{name.substring(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <div className="text-white font-medium">{name}</div>
          <div className="text-gray-400 text-sm">{sport} • {country}</div>
        </div>
        <div className="text-right">
          <div className="text-green-500 font-medium">{events}</div>
          <div className="text-gray-500 text-xs">events</div>
        </div>
      </div>
    </div>
  );
}
