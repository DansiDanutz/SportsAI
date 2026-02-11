import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const features = [
    {
      icon: '🎯',
      title: 'Arbitrage Detection',
      description: 'Guaranteed profit from odds differences across 26+ bookmakers. Our AI finds risk-free opportunities in real-time.'
    },
    {
      icon: '🧠',
      title: 'AI Match Predictor',
      description: 'ML-powered predictions with sentiment analysis, historical data, and team performance metrics for maximum accuracy.'
    },
    {
      icon: '🤖',
      title: 'Autonomous Engine',
      description: '24/7 automated betting with intelligent bankroll management and instant kill switch for complete control.'
    },
    {
      icon: '💰',
      title: 'Managed Fund',
      description: 'Simply deposit funds, sit back, and collect your 90% profit share monthly. Professional fund management included.'
    }
  ];

  const testimonials = [
    {
      name: "Michael Chen",
      role: "Professional Trader",
      content: "Made $2,400 in my first month. The arbitrage detection is incredibly accurate and the autonomous engine works while I sleep.",
      profit: "+$2,400"
    },
    {
      name: "Sarah Williams",
      role: "Sports Investor",
      content: "Finally, a sports betting platform that actually works. The AI predictions combined with arbitrage opportunities is game-changing.",
      profit: "+$1,850"
    },
    {
      name: "David Rodriguez",
      role: "Data Scientist",
      content: "As someone who understands ML, I'm impressed by the prediction accuracy. The risk management features are top-notch.",
      profit: "+$3,200"
    }
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleGetStarted = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 mr-3">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">SportsAI</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <button
                onClick={handleGetStarted}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 blur-3xl -z-10 transform scale-150"></div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Sports Betting Fund
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Autonomous betting engine with guaranteed arbitrage opportunities. 
              <span className="text-green-400 font-semibold"> 90% profit share</span> on all wins.
              Sit back and watch your money grow.
            </p>

            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg font-bold px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-green-500/25 mb-12"
            >
              Start Now - $399
            </button>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-green-400">26</div>
                <div className="text-gray-300 text-sm">Bookmakers</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-blue-400">AI</div>
                <div className="text-gray-300 text-sm">Predictions</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-purple-400">24/7</div>
                <div className="text-gray-300 text-sm">Autonomous</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-yellow-400">90%</div>
                <div className="text-gray-300 text-sm">Profit Share</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Four Core Tools, One Powerful System
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our AI engine combines multiple strategies to maximize your returns while minimizing risk
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10 group"
              >
                <div className="text-4xl mb-4 group-hover:animate-pulse">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">
              Three simple steps to start earning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Deposit Funds</h3>
              <p className="text-gray-400">
                Minimum deposit of $100 to start. Your funds are secured and managed by our professional trading algorithms.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-4">AI Engine Works</h3>
              <p className="text-gray-400">
                Our autonomous engine finds optimal betting opportunities, places strategic bets, and manages risk 24/7.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Collect Profits</h3>
              <p className="text-gray-400">
                Receive your 90% profit share monthly. Track performance in real-time with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400">
              One-time purchase, lifetime access to all features
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 sm:p-12 border border-gray-700/50 shadow-2xl relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-3xl blur-sm opacity-30"></div>
            
            <div className="relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Professional Access</h3>
                <div className="flex items-center justify-center mb-6">
                  <span className="text-6xl font-bold text-white">$399</span>
                  <span className="text-gray-400 ml-2">one-time</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  'All 4 core AI tools included',
                  'Daily AI predictions & insights', 
                  'Accumulator ticket builder',
                  'Real-time alerts & notifications',
                  'Advanced bankroll management',
                  'Access to 26+ bookmakers',
                  'Kill switch & risk controls',
                  '90% profit share guarantee'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGetStarted}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xl font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Buy Now - Start Earning
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Trusted by Profitable Traders
            </h2>
            <p className="text-xl text-gray-400">
              See what our users are saying about their results
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 mb-12">
            <div className="text-center">
              <div className="mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-2xl">★</span>
                ))}
              </div>
              
              <blockquote className="text-xl sm:text-2xl text-gray-300 mb-6 italic leading-relaxed">
                "{testimonials[currentTestimonial].content}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="text-right">
                  <div className="text-white font-semibold">{testimonials[currentTestimonial].name}</div>
                  <div className="text-gray-400 text-sm">{testimonials[currentTestimonial].role}</div>
                </div>
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                  {testimonials[currentTestimonial].profit}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-400">
            <p className="mb-4">
              <span className="font-semibold text-white">Powered by OpenRouter AI</span> • 
              26+ bookmakers • Real-time data feeds
            </p>
            <p className="text-sm">
              Results may vary. Past performance doesn't guarantee future returns.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800/50 border-t border-gray-700/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 mr-3">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">SportsAI</span>
              </div>
              <p className="text-gray-400">
                Professional AI-powered sports betting fund with guaranteed profit sharing.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Get Started</Link></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="mailto:support@sportsai.com" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2026 SportsAI. All rights reserved.
              </p>
              <div className="flex items-center mt-4 md:mt-0">
                <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                  ⚠️ Gambling Risk Disclaimer
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-gray-500 text-xs leading-relaxed">
                <strong>Risk Warning:</strong> Gambling involves risk and can result in financial loss. 
                While our AI system is designed to maximize profits through arbitrage and predictive analytics, 
                no betting system can guarantee profits. Only invest what you can afford to lose. 
                If you have a gambling problem, seek help from responsible gambling organizations.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}