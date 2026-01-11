import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';

// Bookmaker deep links (mapping)
const bookmakerData: Record<string, {
  id: string;
  name: string;
  website: string;
  description: string;
  regions: string[];
  sports: Array<{ name: string; marketsCount: number }>;
  strengths: string[];
  limitations: string[];
  dataFreshness: string;
  priority: number;
}> = {
  bet365: {
    id: 'bet365',
    name: 'Bet365',
    website: 'https://www.bet365.com',
    description: 'One of the world\'s leading online gambling companies, offering a comprehensive range of sports betting markets with competitive odds.',
    regions: ['United Kingdom', 'Europe', 'Asia Pacific', 'Americas'],
    sports: [
      { name: 'Soccer', marketsCount: 200 },
      { name: 'Basketball', marketsCount: 80 },
      { name: 'Tennis', marketsCount: 60 },
      { name: 'American Football', marketsCount: 75 },
      { name: 'Cricket', marketsCount: 50 },
      { name: 'Ice Hockey', marketsCount: 45 },
      { name: 'MMA', marketsCount: 25 },
      { name: 'eSports', marketsCount: 40 },
    ],
    strengths: [
      'Extensive live betting coverage',
      'Excellent in-play odds',
      'Wide range of markets per event',
      'Fast odds updates',
    ],
    limitations: [
      'May limit winning accounts',
      'Complex bonus terms',
    ],
    dataFreshness: 'Real-time (< 2s latency)',
    priority: 1,
  },
  william_hill: {
    id: 'william_hill',
    name: 'William Hill',
    website: 'https://www.williamhill.com',
    description: 'Established British bookmaker with over 80 years of experience, known for competitive horse racing odds and wide sports coverage.',
    regions: ['United Kingdom', 'Europe', 'United States'],
    sports: [
      { name: 'Soccer', marketsCount: 180 },
      { name: 'Horse Racing', marketsCount: 100 },
      { name: 'Basketball', marketsCount: 70 },
      { name: 'Tennis', marketsCount: 55 },
      { name: 'American Football', marketsCount: 65 },
      { name: 'Golf', marketsCount: 40 },
    ],
    strengths: [
      'Excellent horse racing coverage',
      'Trusted UK brand',
      'Good value odds on British sports',
      'Cash-out feature available',
    ],
    limitations: [
      'Odds can lag behind competitors',
      'Limited eSports coverage',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 2,
  },
  betfair: {
    id: 'betfair',
    name: 'Betfair',
    website: 'https://www.betfair.com',
    description: 'The world\'s largest betting exchange, offering unique exchange betting alongside traditional sportsbook markets.',
    regions: ['United Kingdom', 'Europe', 'Australia'],
    sports: [
      { name: 'Soccer', marketsCount: 190 },
      { name: 'Horse Racing', marketsCount: 120 },
      { name: 'Tennis', marketsCount: 65 },
      { name: 'Cricket', marketsCount: 55 },
      { name: 'Basketball', marketsCount: 60 },
    ],
    strengths: [
      'Exchange betting with best odds',
      'Lay betting option',
      'High liquidity on popular events',
      'Great for arbitrage opportunities',
    ],
    limitations: [
      'Exchange commission on winnings',
      'Smaller markets may lack liquidity',
    ],
    dataFreshness: 'Real-time (< 2s latency)',
    priority: 2,
  },
  unibet: {
    id: 'unibet',
    name: 'Unibet',
    website: 'https://www.unibet.com',
    description: 'Part of Kindred Group, offering a user-friendly platform with competitive odds across major sports.',
    regions: ['Europe', 'Australia', 'United States'],
    sports: [
      { name: 'Soccer', marketsCount: 150 },
      { name: 'Basketball', marketsCount: 65 },
      { name: 'Tennis', marketsCount: 50 },
      { name: 'Ice Hockey', marketsCount: 40 },
      { name: 'American Football', marketsCount: 55 },
    ],
    strengths: [
      'Clean user interface',
      'Good mobile app',
      'Competitive odds on European sports',
      'Reliable payouts',
    ],
    limitations: [
      'Limited exotic markets',
      'Slower to update odds',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 1,
  },
  superbet: {
    id: 'superbet',
    name: 'Superbet',
    website: 'https://www.superbet.com',
    description: 'Fast-growing Eastern European bookmaker with strong presence in Romania and expanding across Europe.',
    regions: ['Romania', 'Poland', 'Europe'],
    sports: [
      { name: 'Soccer', marketsCount: 160 },
      { name: 'Basketball', marketsCount: 55 },
      { name: 'Tennis', marketsCount: 45 },
      { name: 'Ice Hockey', marketsCount: 35 },
    ],
    strengths: [
      'Excellent odds on Eastern European leagues',
      'Fast-growing platform',
      'Generous promotions',
    ],
    limitations: [
      'Limited availability outside Europe',
      'Fewer exotic markets',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 1,
  },
  betano: {
    id: 'betano',
    name: 'Betano',
    website: 'https://www.betano.com',
    description: 'Kaizen Gaming\'s flagship brand, popular in Europe and Latin America with competitive odds and features.',
    regions: ['Europe', 'Latin America', 'Brazil'],
    sports: [
      { name: 'Soccer', marketsCount: 170 },
      { name: 'Basketball', marketsCount: 60 },
      { name: 'Tennis', marketsCount: 50 },
      { name: 'eSports', marketsCount: 35 },
    ],
    strengths: [
      'Strong Latin American coverage',
      'Competitive soccer odds',
      'Cash-out feature',
    ],
    limitations: [
      'Limited US sports coverage',
      'Newer platform',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 1,
  },
  stake: {
    id: 'stake',
    name: 'Stake',
    website: 'https://www.stake.com',
    description: 'Crypto-friendly sportsbook with competitive odds and a modern platform, popular for eSports betting.',
    regions: ['Global (Crypto-focused)'],
    sports: [
      { name: 'Soccer', marketsCount: 165 },
      { name: 'eSports', marketsCount: 80 },
      { name: 'Basketball', marketsCount: 70 },
      { name: 'MMA', marketsCount: 45 },
      { name: 'Tennis', marketsCount: 55 },
    ],
    strengths: [
      'Excellent eSports coverage',
      'Crypto-native with fast transactions',
      'Competitive odds',
      'No KYC for crypto users',
    ],
    limitations: [
      'Not available in many jurisdictions',
      'Limited traditional payment options',
    ],
    dataFreshness: 'Real-time (< 2s latency)',
    priority: 1,
  },
  paddy_power: {
    id: 'paddy_power',
    name: 'Paddy Power',
    website: 'https://www.paddypower.com',
    description: 'Irish bookmaker known for humorous marketing and competitive odds, part of Flutter Entertainment.',
    regions: ['Ireland', 'United Kingdom'],
    sports: [
      { name: 'Soccer', marketsCount: 170 },
      { name: 'Horse Racing', marketsCount: 95 },
      { name: 'GAA', marketsCount: 40 },
      { name: 'Golf', marketsCount: 45 },
      { name: 'Tennis', marketsCount: 50 },
    ],
    strengths: [
      'Money-back specials',
      'Great Irish sports coverage',
      'Competitive golf odds',
      'Fun betting experience',
    ],
    limitations: [
      'UK/Ireland focused',
      'Can be aggressive with account limits',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 2,
  },
  ladbrokes: {
    id: 'ladbrokes',
    name: 'Ladbrokes',
    website: 'https://www.ladbrokes.com',
    description: 'One of the oldest British bookmakers, offering comprehensive sports betting with retail and online presence.',
    regions: ['United Kingdom', 'Europe', 'Australia'],
    sports: [
      { name: 'Soccer', marketsCount: 175 },
      { name: 'Horse Racing', marketsCount: 90 },
      { name: 'Tennis', marketsCount: 55 },
      { name: 'Basketball', marketsCount: 65 },
      { name: 'Cricket', marketsCount: 45 },
    ],
    strengths: [
      'Established brand with retail presence',
      'Good horse racing coverage',
      'Regular promotions',
    ],
    limitations: [
      'Interface can feel dated',
      'Quick to limit winners',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 2,
  },
  '888sport': {
    id: '888sport',
    name: '888sport',
    website: 'https://www.888sport.com',
    description: '888 Holdings\' sports betting brand, offering a solid range of markets with competitive odds.',
    regions: ['United Kingdom', 'Europe'],
    sports: [
      { name: 'Soccer', marketsCount: 160 },
      { name: 'Basketball', marketsCount: 60 },
      { name: 'Tennis', marketsCount: 50 },
      { name: 'American Football', marketsCount: 55 },
      { name: 'Ice Hockey', marketsCount: 40 },
    ],
    strengths: [
      'Part of established 888 group',
      'Competitive welcome offers',
      'Good mobile experience',
    ],
    limitations: [
      'Odds not always the best',
      'Limited exotic markets',
    ],
    dataFreshness: 'Near real-time (< 5s latency)',
    priority: 2,
  },
};

export function BookmakerDetailPage() {
  const { bookmakerId } = useParams<{ bookmakerId: string }>();
  const [isEnabled, setIsEnabled] = useState(true);

  const bookmaker = bookmakerId ? bookmakerData[bookmakerId] : null;

  if (!bookmaker) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl text-white mb-4">Bookmaker not found</h1>
          <p className="text-gray-400 mb-6">The bookmaker you're looking for doesn't exist.</p>
          <Link
            to="/bookmakers"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Browse Bookmakers
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
              <Link to="/bookmakers" className="text-gray-400 hover:text-white transition-colors">
                Bookmakers
              </Link>
            </li>
            <li className="text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-white font-medium">
              {bookmaker.name}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center text-3xl">
                {bookmaker.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{bookmaker.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {bookmaker.regions.slice(0, 4).map((region) => (
                    <span
                      key={region}
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isEnabled
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isEnabled ? 'Exclude from Comparisons' : 'Include in Comparisons'}
              </button>
              <a
                href={bookmaker.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                Open Sportsbook
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <p className="text-gray-400 mt-4">{bookmaker.description}</p>
        </div>

        {/* Status Badge */}
        <div className="mb-8 p-4 rounded-lg border flex items-center gap-3 bg-gray-800 border-gray-700">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-white font-medium">
            {isEnabled ? 'Active - Included in odds comparisons' : 'Inactive - Excluded from odds comparisons'}
          </span>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-gray-400 text-sm">{bookmaker.dataFreshness}</span>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sports Coverage */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sports Coverage</h2>
            <div className="space-y-3">
              {bookmaker.sports.map((sport) => (
                <div key={sport.name} className="flex items-center justify-between">
                  <span className="text-white">{sport.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.min(100, (sport.marketsCount / 200) * 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-20 text-right">
                      {sport.marketsCount} markets
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Limitations */}
          <div className="space-y-6">
            {/* Strengths */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-green-400">+</span> Strengths
              </h2>
              <ul className="space-y-2">
                {bookmaker.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-300">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">!</span> Known Limitations
              </h2>
              <ul className="space-y-2">
                {bookmaker.limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-300">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Deep Link Info */}
        <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Deep Link Information</h2>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Website URL:</span>
              <a
                href={bookmaker.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 flex items-center gap-2"
              >
                {bookmaker.website}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Clicking odds in the comparison table will take you directly to this bookmaker's website.
            Some sportsbooks support direct deep linking to specific events/markets.
          </p>
        </div>
      </div>
    </Layout>
  );
}
