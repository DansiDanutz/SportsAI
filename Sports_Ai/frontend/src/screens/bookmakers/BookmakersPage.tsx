import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

interface Bookmaker {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  sportsCount: number;
  marketsCount: number;
  regions: string[];
  isEnabled: boolean;
  oddsCount: number;
}

export function BookmakersPage() {
  const { data: bookmakers = [], isLoading } = useQuery<Bookmaker[]>({
    queryKey: ['bookmakers'],
    queryFn: async () => {
      const response = await api.get('/v1/bookmakers');
      return response.data;
    },
  });

  const enabledBookmakers = bookmakers.filter(b => b.isEnabled);
  const disabledBookmakers = bookmakers.filter(b => !b.isEnabled);

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bookmakers</h1>
          <p className="text-gray-400">
            Real sportsbooks connected to our odds intelligence engine. These are derived from live market data.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : bookmakers.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-xl text-white mb-2">No Bookmakers Connected</h3>
            <p className="text-gray-400">
              We haven't detected any bookmaker data yet. Please ensure your API keys are configured and the sync service is running.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="text-3xl font-bold text-green-400">{enabledBookmakers.length}</div>
                <div className="text-gray-400">Active Bookmakers</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="text-3xl font-bold text-cyan-400">
                  {Math.max(0, ...bookmakers.map(b => b.sportsCount))}+
                </div>
                <div className="text-gray-400">Sports Covered</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="text-3xl font-bold text-purple-400">
                  {bookmakers.reduce((acc, b) => acc + b.oddsCount, 0)}
                </div>
                <div className="text-gray-400">Total Odds Quotes</div>
              </div>
            </div>

            {/* Enabled Bookmakers */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Detected Bookmakers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enabledBookmakers.map((bookmaker) => (
                  <Link
                    key={bookmaker.id}
                    to={`/bookmakers/${bookmaker.id}`}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-green-500/50 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                        {bookmaker.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold group-hover:text-green-400 transition-colors">
                          {bookmaker.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmaker.regions.length > 0 ? bookmaker.regions.slice(0, 3).map((region) => (
                            <span
                              key={region}
                              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                            >
                              {region}
                            </span>
                          )) : (
                            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-500 italic">
                              Region unknown
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-3 text-sm text-gray-400">
                          <span>{bookmaker.sportsCount} sports</span>
                          <span>{bookmaker.oddsCount} quotes</span>
                        </div>
                      </div>
                      <div className="text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
