import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { useState } from 'react';

interface Team {
  id: string;
  name: string;
  shortName: string | null;
  country: string | null;
  league: string;
  leagueId: string;
  sport: string;
  sportKey: string;
}

interface TeamEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  venue: string | null;
  league: string;
}

interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[];
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'fixtures' | 'stats'>('fixtures');

  // Fetch team details
  const { data: team, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await api.get<Team>(`/v1/teams/${teamId}`);
      return response.data;
    },
    enabled: !!teamId,
  });

  // Fetch team fixtures
  const { data: fixturesData, isLoading: fixturesLoading } = useQuery({
    queryKey: ['team-fixtures', teamId],
    queryFn: async () => {
      const response = await api.get<{ fixtures: TeamEvent[]; total: number }>(`/v1/teams/${teamId}/fixtures`);
      return response.data;
    },
    enabled: !!teamId,
  });

  // Fetch team stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: async () => {
      const response = await api.get<TeamStats>(`/v1/teams/${teamId}/stats`);
      return response.data;
    },
    enabled: !!teamId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500';
      case 'upcoming':
        return 'bg-blue-500';
      case 'finished':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W':
        return 'bg-green-500';
      case 'D':
        return 'bg-yellow-500';
      case 'L':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (teamLoading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (teamError || !team) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Team Not Found</h2>
            <p className="text-gray-400 mb-4">The team you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/sports')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Back to Sports Hub
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const fixtures = fixturesData?.fixtures || [];
  const stats = statsData || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, form: [] };

  return (
    <Layout>
      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Team Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-700 rounded-xl flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-400">
                {team.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-400">{team.league}</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">{team.sport}</span>
                {team.country && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">{team.country}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'fixtures'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Fixtures
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Stats & Form
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'fixtures' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Team Fixtures</h2>
            </div>
            {fixturesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : fixtures.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-400">No fixtures found for this team.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {fixtures.map((fixture) => (
                  <div
                    key={fixture.id}
                    onClick={() => navigate(`/event/${fixture.id}`)}
                    className="p-4 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getStatusColor(fixture.status)}`}>
                            {fixture.status.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{fixture.league}</span>
                        </div>
                        <div className="text-white font-medium">
                          {fixture.homeTeam} vs {fixture.awayTeam}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {formatDate(fixture.startTime)}
                          {fixture.venue && ` • ${fixture.venue}`}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Season Stats */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Season Statistics</h2>
              {statsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{stats.played}</div>
                    <div className="text-sm text-gray-400">Played</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.won}</div>
                    <div className="text-sm text-gray-400">Won</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-500">{stats.drawn}</div>
                    <div className="text-sm text-gray-400">Drawn</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">{stats.lost}</div>
                    <div className="text-sm text-gray-400">Lost</div>
                  </div>
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Goals</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-500">{stats.goalsFor}</div>
                  <div className="text-sm text-gray-400">Goals Scored</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-500">{stats.goalsAgainst}</div>
                  <div className="text-sm text-gray-400">Goals Conceded</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <span className="text-2xl font-bold text-white">
                    {stats.goalsFor - stats.goalsAgainst > 0 ? '+' : ''}{stats.goalsFor - stats.goalsAgainst}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">Goal Difference</span>
                </div>
              </div>
            </div>

            {/* Recent Form */}
            {stats.form && stats.form.length > 0 && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Form</h2>
                <div className="flex gap-2">
                  {stats.form.map((result, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${getFormColor(result)}`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-4">Last {stats.form.length} matches</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
