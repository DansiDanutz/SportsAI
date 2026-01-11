import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';

// Bookmaker data with deep links and coverage info
const bookmakers = [
  {
    id: 'bet365',
    name: 'Bet365',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.bet365.com',
    sportsCount: 35,
    marketsCount: 150,
    regions: ['UK', 'EU', 'APAC'],
    priority: 1,
    isEnabled: true,
  },
  {
    id: 'william_hill',
    name: 'William Hill',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.williamhill.com',
    sportsCount: 30,
    marketsCount: 120,
    regions: ['UK', 'EU'],
    priority: 2,
    isEnabled: true,
  },
  {
    id: 'betfair',
    name: 'Betfair',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.betfair.com',
    sportsCount: 32,
    marketsCount: 140,
    regions: ['UK', 'EU', 'APAC'],
    priority: 2,
    isEnabled: true,
  },
  {
    id: 'unibet',
    name: 'Unibet',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.unibet.com',
    sportsCount: 28,
    marketsCount: 100,
    regions: ['EU', 'APAC'],
    priority: 1,
    isEnabled: true,
  },
  {
    id: 'superbet',
    name: 'Superbet',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.superbet.com',
    sportsCount: 25,
    marketsCount: 90,
    regions: ['EU'],
    priority: 1,
    isEnabled: true,
  },
  {
    id: 'betano',
    name: 'Betano',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.betano.com',
    sportsCount: 26,
    marketsCount: 95,
    regions: ['EU', 'LATAM'],
    priority: 1,
    isEnabled: true,
  },
  {
    id: 'stake',
    name: 'Stake',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.stake.com',
    sportsCount: 30,
    marketsCount: 110,
    regions: ['Global'],
    priority: 1,
    isEnabled: true,
  },
  {
    id: 'paddy_power',
    name: 'Paddy Power',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.paddypower.com',
    sportsCount: 28,
    marketsCount: 100,
    regions: ['UK', 'IE'],
    priority: 2,
    isEnabled: true,
  },
  {
    id: 'ladbrokes',
    name: 'Ladbrokes',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.ladbrokes.com',
    sportsCount: 29,
    marketsCount: 105,
    regions: ['UK', 'EU'],
    priority: 2,
    isEnabled: true,
  },
  {
    id: '888sport',
    name: '888sport',
    logo: 'https://via.placeholder.com/48',
    website: 'https://www.888sport.com',
    sportsCount: 27,
    marketsCount: 98,
    regions: ['UK', 'EU'],
    priority: 2,
    isEnabled: true,
  },
];

export function BookmakersPage() {
  const enabledBookmakers = bookmakers.filter(b => b.isEnabled);
  const disabledBookmakers = bookmakers.filter(b => !b.isEnabled);

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bookmakers</h1>
          <p className="text-gray-400">
            Manage which sportsbooks are included in odds comparisons. Click on a bookmaker to view detailed coverage.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="text-3xl font-bold text-green-400">{enabledBookmakers.length}</div>
            <div className="text-gray-400">Active Bookmakers</div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="text-3xl font-bold text-cyan-400">
              {Math.max(...bookmakers.map(b => b.sportsCount))}+
            </div>
            <div className="text-gray-400">Sports Covered</div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="text-3xl font-bold text-purple-400">
              {Math.max(...bookmakers.map(b => b.marketsCount))}+
            </div>
            <div className="text-gray-400">Markets Available</div>
          </div>
        </div>

        {/* Enabled Bookmakers */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Active Bookmakers</h2>
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
                      {bookmaker.regions.slice(0, 3).map((region) => (
                        <span
                          key={region}
                          className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-3 text-sm text-gray-400">
                      <span>{bookmaker.sportsCount} sports</span>
                      <span>{bookmaker.marketsCount} markets</span>
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

        {/* Disabled Bookmakers */}
        {disabledBookmakers.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-gray-400">Excluded Bookmakers</span>
              <span className="text-sm text-gray-500">({disabledBookmakers.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disabledBookmakers.map((bookmaker) => (
                <Link
                  key={bookmaker.id}
                  to={`/bookmakers/${bookmaker.id}`}
                  className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 hover:border-gray-600 transition-all group opacity-60"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center text-2xl text-gray-500">
                      {bookmaker.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-400 font-semibold group-hover:text-gray-300 transition-colors">
                        {bookmaker.name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bookmaker.regions.slice(0, 3).map((region) => (
                          <span
                            key={region}
                            className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-500"
                          >
                            {region}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-3 text-sm text-gray-500">
                        <span>{bookmaker.sportsCount} sports</span>
                        <span>{bookmaker.marketsCount} markets</span>
                      </div>
                    </div>
                    <div className="text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
