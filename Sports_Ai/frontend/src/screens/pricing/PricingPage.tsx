import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  cta: string;
  popular?: boolean;
  badge?: string;
}

const monthlyTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for exploring arbitrage betting basics',
    features: [
      'Up to 5 arbitrage alerts/day',
      '3 bookmaker coverage',
      'Basic odds comparison',
      'Email notifications',
      'Community forum access',
      'Demo mode with sample data',
    ],
    notIncluded: [
      'AI match predictions',
      'Autonomous betting engine',
      'Real-time WebSocket feeds',
      'Priority support',
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For serious bettors who want consistent profits',
    features: [
      'Unlimited arbitrage alerts',
      '26+ bookmaker coverage',
      'AI match predictions (85%+ accuracy)',
      'Real-time WebSocket odds feed',
      'Custom alert filters & presets',
      'Line movement tracking',
      'Bankroll management tools',
      'Telegram & push notifications',
      'Performance analytics dashboard',
      'Priority email support',
    ],
    cta: 'Start 7-Day Free Trial',
    popular: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/mo',
    description: 'Full autonomous system with managed fund option',
    features: [
      'Everything in Pro, plus:',
      'Autonomous betting engine (24/7)',
      'AI-powered staking optimization',
      'Multi-account management',
      'Managed fund option (90% profit share)',
      'Advanced risk controls & kill switch',
      'API access for custom integrations',
      'Dedicated account manager',
      'White-label options',
      'Custom bookmaker integrations',
      'SLA guarantee (99.9% uptime)',
      'Phone & video support',
    ],
    cta: 'Contact Sales',
  },
];

const yearlyTiers: PricingTier[] = monthlyTiers.map((tier) => {
  if (tier.price === 'Free') return tier;
  const monthly = parseInt(tier.price.replace('$', ''));
  const yearly = Math.round(monthly * 10); // 2 months free
  return {
    ...tier,
    price: `$${yearly}`,
    period: '/yr',
    badge: tier.popular ? 'Most Popular' : undefined,
  };
});

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const comparisonFeatures = [
  { feature: 'Arbitrage Detection', starter: true, pro: true, enterprise: true },
  { feature: 'Bookmaker Coverage', starter: '3', pro: '26+', enterprise: '26+ Custom' },
  { feature: 'Daily Alerts', starter: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'AI Match Predictions', starter: false, pro: true, enterprise: true },
  { feature: 'Prediction Accuracy', starter: '-', pro: '85%+', enterprise: '90%+' },
  { feature: 'Real-time Odds Feed', starter: false, pro: true, enterprise: true },
  { feature: 'Line Movement Tracking', starter: false, pro: true, enterprise: true },
  { feature: 'Custom Alert Presets', starter: false, pro: true, enterprise: true },
  { feature: 'Performance Analytics', starter: 'Basic', pro: 'Advanced', enterprise: 'Enterprise' },
  { feature: 'Autonomous Betting', starter: false, pro: false, enterprise: true },
  { feature: 'Managed Fund', starter: false, pro: false, enterprise: true },
  { feature: 'API Access', starter: false, pro: false, enterprise: true },
  { feature: 'Multi-Account Mgmt', starter: false, pro: false, enterprise: true },
  { feature: 'Support', starter: 'Community', pro: 'Priority Email', enterprise: 'Dedicated Manager' },
  { feature: 'Uptime SLA', starter: '-', pro: '99.5%', enterprise: '99.9%' },
];

const faqs = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, all plans are month-to-month with no long-term contracts. Cancel anytime from your dashboard. Annual plans can be refunded pro-rata within the first 30 days.',
  },
  {
    q: 'How does the 7-day free trial work?',
    a: "Start your Pro trial with no credit card required. You'll get full access to all Pro features for 7 days. If you love it, add payment to continue. If not, no charges.",
  },
  {
    q: 'What is the Managed Fund option?',
    a: 'With the Enterprise plan, you can deposit funds into our managed arbitrage fund. Our AI system executes trades 24/7 and you receive 90% of profits monthly. Minimum deposit: $1,000.',
  },
  {
    q: 'How accurate are the AI predictions?',
    a: 'Our ML models achieve 85%+ accuracy on match predictions by analyzing historical data, team form, injuries, sentiment, and real-time odds movements. Enterprise clients get enhanced models with 90%+ accuracy.',
  },
  {
    q: 'Is my money safe?',
    a: 'We never hold your betting funds. You bet through your own bookmaker accounts. For the Managed Fund, deposits are held in segregated accounts with full transparency and weekly reports.',
  },
  {
    q: 'Do you support my country?',
    a: 'SportsAI works globally wherever online betting is legal. We cover international bookmakers like Bet365, Pinnacle, 1xBet, William Hill, and 20+ more. Check our bookmaker list for your region.',
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const tiers = isYearly ? yearlyTiers : monthlyTiers;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              SportsAI
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-8 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          Choose Your{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Winning Plan
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          From casual exploration to fully autonomous profit generation.
          Start free, upgrade when you're ready.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-medium ${!isYearly ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? 'bg-emerald-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                isYearly ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-white' : 'text-gray-500'}`}>
            Yearly
            <span className="ml-1.5 text-xs text-emerald-400 font-bold">Save 17%</span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                tier.popular
                  ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-gray-900/50 shadow-lg shadow-emerald-500/10'
                  : 'border-gray-800 bg-gray-900/30'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-white">{tier.price}</span>
                {tier.period && <span className="text-gray-400 text-lg">{tier.period}</span>}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
                {tier.notIncluded?.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <XIcon />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (tier.name === 'Enterprise') {
                    window.location.href = 'mailto:sales@sportsai.app?subject=Enterprise%20Plan%20Inquiry';
                  } else {
                    navigate('/register');
                  }
                }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Detailed Feature Comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/50">
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">Feature</th>
                  <th className="text-center p-4 text-gray-400 font-medium text-sm w-32">Starter</th>
                  <th className="text-center p-4 text-emerald-400 font-medium text-sm w-32">Pro</th>
                  <th className="text-center p-4 text-gray-400 font-medium text-sm w-32">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-gray-900/20' : ''}>
                    <td className="p-4 text-sm text-gray-300">{row.feature}</td>
                    {(['starter', 'pro', 'enterprise'] as const).map((plan) => (
                      <td key={plan} className="p-4 text-center">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan] ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-300">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: '🔒', label: 'Bank-Grade Security', sub: '256-bit encryption' },
            { icon: '⚡', label: '99.9% Uptime', sub: 'Enterprise SLA' },
            { icon: '🌍', label: 'Global Coverage', sub: '26+ bookmakers' },
            { icon: '💬', label: '24/7 Support', sub: 'Average < 2hr response' },
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center">
              <span className="text-3xl mb-2">{badge.icon}</span>
              <span className="text-white font-semibold text-sm">{badge.label}</span>
              <span className="text-gray-500 text-xs">{badge.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/30 transition-colors"
                >
                  <span className="text-white font-medium pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-400 leading-relaxed border-t border-gray-700/30">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-emerald-950/50 to-blue-950/50 border border-emerald-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Winning?</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of smart bettors using AI to find guaranteed profits.
          </p>
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/25"
          >
            Start Your Free Trial →
          </Link>
          <p className="text-gray-500 text-sm mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 px-4 text-center text-gray-500 text-sm">
        <p>© 2026 SportsAI. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}
