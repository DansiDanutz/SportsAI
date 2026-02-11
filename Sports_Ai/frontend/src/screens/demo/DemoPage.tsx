import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { ProgressRing } from '../../components/ui/ProgressRing';

interface ArbitrageOpportunity {
  id: string;
  event: string;
  sport: string;
  profit: number;
  legs: {
    outcome: string;
    odds: number;
    bookmaker: string;
    stake: number;
    return: number;
  }[];
  status: 'calculating' | 'ready';
}

interface AccumulatorTicket {
  id: string;
  title: string;
  legs: number;
  combinedOdds: number;
  stake: number;
  potentialReturn: number;
  matches: string[];
}

export function DemoPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([
    {
      id: '1',
      event: 'Manchester City vs Liverpool',
      sport: 'Soccer',
      profit: 0,
      legs: [
        { outcome: 'Home Win', odds: 2.15, bookmaker: 'Pinnacle', stake: 0, return: 0 },
        { outcome: 'Draw', odds: 3.40, bookmaker: 'Bet365', stake: 0, return: 0 },
        { outcome: 'Away Win', odds: 3.80, bookmaker: 'William Hill', stake: 0, return: 0 }
      ],
      status: 'calculating'
    },
    {
      id: '2',
      event: 'Lakers vs Warriors',
      sport: 'Basketball',
      profit: 0,
      legs: [
        { outcome: 'Lakers Win', odds: 2.05, bookmaker: 'William Hill', stake: 0, return: 0 },
        { outcome: 'Warriors Win', odds: 1.95, bookmaker: 'Pinnacle', stake: 0, return: 0 }
      ],
      status: 'calculating'
    },
    {
      id: '3',
      event: 'Djokovic vs Nadal',
      sport: 'Tennis',
      profit: 0,
      legs: [
        { outcome: 'Djokovic Win', odds: 1.75, bookmaker: 'Bet365', stake: 0, return: 0 },
        { outcome: 'Nadal Win', odds: 2.35, bookmaker: 'William Hill', stake: 0, return: 0 }
      ],
      status: 'calculating'
    }
  ]);

  const [aiPrediction, setAiPrediction] = useState({
    homeWin: 0,
    draw: 0,
    awayWin: 0,
    confidence: 0,
    isLoaded: false
  });

  const [fundPerformance, setFundPerformance] = useState({
    startingAmount: 10000,
    currentAmount: 10000,
    roi: 0,
    winRate: 0,
    monthlyProfit: 0,
    isLoaded: false
  });

  const [accumulatorTickets] = useState<AccumulatorTicket[]>([
    {
      id: '1',
      title: 'Odds 2+ Accumulator',
      legs: 3,
      combinedOdds: 2.15,
      stake: 200,
      potentialReturn: 430,
      matches: ['Barcelona vs Real Madrid', 'Arsenal vs Chelsea', 'PSG vs Bayern Munich']
    },
    {
      id: '2',
      title: 'Odds 3+ Accumulator', 
      legs: 4,
      combinedOdds: 3.42,
      stake: 150,
      potentialReturn: 513,
      matches: ['Man City vs Liverpool', 'Juventus vs Milan', 'Atletico vs Sevilla', 'Dortmund vs Leipzig']
    }
  ]);

  // Simulate arbitrage calculation
  useEffect(() => {
    const calculateArbitrage = (index: number) => {
      setTimeout(() => {
        setArbitrageOpportunities(prev => {
          const updated = [...prev];
          const opp = updated[index];
          
          // Simulate calculation - determine stakes for $1000 total
          let totalStake = 1000;
          let stakes: number[] = [];
          let totalImplied = 0;
          
          // Calculate implied probabilities
          opp.legs.forEach(leg => {
            totalImplied += 1 / leg.odds;
          });
          
          // Calculate individual stakes
          opp.legs.forEach((leg, legIndex) => {
            const impliedProb = 1 / leg.odds;
            const stake = (impliedProb / totalImplied) * totalStake;
            stakes.push(stake);
            updated[index].legs[legIndex].stake = stake;
            updated[index].legs[legIndex].return = stake * leg.odds;
          });
          
          // Calculate profit percentage
          const profit = ((stakes[0] * opp.legs[0].odds) - totalStake) / totalStake * 100;
          updated[index].profit = Math.max(profit, [4.2, 2.8, 1.5][index]); // Ensure positive profit for demo
          updated[index].status = 'ready';
          
          return updated;
        });
      }, 2000 + index * 1000); // Stagger the calculations
    };

    arbitrageOpportunities.forEach((_, index) => {
      calculateArbitrage(index);
    });
  }, []);

  // Simulate AI prediction loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setAiPrediction({
        homeWin: 52.3,
        draw: 24.1,
        awayWin: 23.6,
        confidence: 87,
        isLoaded: true
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate fund performance loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setFundPerformance({
        startingAmount: 10000,
        currentAmount: 12450,
        roi: 24.5,
        winRate: 67,
        monthlyProfit: 2450,
        isLoaded: true
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SportsAI Live Demo
          </h1>
          <p className="text-xl text-green-100 mb-6">
            Experience our AI-powered sports betting platform in action
          </p>
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-green-100">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Demo Mode</span>
            <span className="text-xs">•</span>
            <span className="text-xs">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Live Arbitrage Demo */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-white">Live Arbitrage Opportunities</h2>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {arbitrageOpportunities.map((opp, index) => (
              <div key={opp.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{opp.sport}</span>
                  {opp.status === 'calculating' ? (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                      <span className="text-xs">Calculating...</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-green-500">
                      +<AnimatedCounter value={opp.profit} decimals={1} suffix="%" />
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-4">{opp.event}</h3>
                
                <div className="space-y-3">
                  {opp.legs.map((leg, legIndex) => (
                    <div key={legIndex} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{leg.outcome}</span>
                        <span className="text-gray-400">{leg.bookmaker}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{leg.odds.toFixed(2)}</div>
                        {opp.status === 'ready' && (
                          <div className="text-gray-400 text-xs">
                            $<AnimatedCounter value={leg.stake} decimals={0} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {opp.status === 'ready' && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Guaranteed Profit:</span>
                      <span className="text-green-400 font-bold">
                        $<AnimatedCounter value={(opp.legs[0].return - 1000)} decimals={0} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* AI Prediction Demo */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-white">AI Match Prediction</h2>
            <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
              87% Confidence
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Barcelona vs Real Madrid</h3>
                  <p className="text-gray-400">La Liga • Sunday 15:00</p>
                  <div className="mt-4 flex justify-center">
                    <ProgressRing 
                      value={aiPrediction.confidence} 
                      size="lg" 
                      color="blue"
                      animated={aiPrediction.isLoaded}
                      label="Confidence"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-4">Win Probabilities</h4>
                
                {/* Home Win */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Barcelona Win</span>
                    <span className="text-green-400 font-bold">
                      <AnimatedCounter value={aiPrediction.homeWin} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-2000 ease-out"
                      style={{ 
                        width: aiPrediction.isLoaded ? `${aiPrediction.homeWin}%` : '0%' 
                      }}
                    />
                  </div>
                  {aiPrediction.isLoaded && aiPrediction.homeWin > 50 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium animate-pulse">
                        Value Bet Detected
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Draw */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Draw</span>
                    <span className="text-yellow-400 font-bold">
                      <AnimatedCounter value={aiPrediction.draw} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-2000 ease-out delay-500"
                      style={{ 
                        width: aiPrediction.isLoaded ? `${aiPrediction.draw}%` : '0%' 
                      }}
                    />
                  </div>
                </div>
                
                {/* Away Win */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Real Madrid Win</span>
                    <span className="text-red-400 font-bold">
                      <AnimatedCounter value={aiPrediction.awayWin} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-2000 ease-out delay-1000"
                      style={{ 
                        width: aiPrediction.isLoaded ? `${aiPrediction.awayWin}%` : '0%' 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Accumulator Demo */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-white">Smart Accumulator Builder</h2>
            <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
              AI Optimized
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {accumulatorTickets.map((ticket) => (
              <div key={ticket.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{ticket.title}</h3>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                    {ticket.legs} legs
                  </span>
                </div>
                
                <div className="space-y-3 mb-6">
                  {ticket.matches.map((match, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{match}</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      <AnimatedCounter value={ticket.combinedOdds} decimals={2} />
                    </div>
                    <div className="text-sm text-gray-400">Combined Odds</div>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      $<AnimatedCounter value={ticket.stake} decimals={0} />
                    </div>
                    <div className="text-sm text-gray-400">Stake</div>
                  </div>
                </div>
                
                <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Potential Return:</span>
                    <span className="text-green-400 font-bold text-xl">
                      $<AnimatedCounter value={ticket.potentialReturn} decimals={0} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300">Potential Profit:</span>
                    <span className="text-green-400 font-bold">
                      $<AnimatedCounter value={ticket.potentialReturn - ticket.stake} decimals={0} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fund Performance Demo */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-white">30-Day Performance</h2>
            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
              +24.5% ROI
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-white mb-2">
                    $<AnimatedCounter 
                      value={fundPerformance.currentAmount} 
                      decimals={0} 
                      duration={2000}
                    />
                  </div>
                  <p className="text-gray-400 mb-4">Current Balance</p>
                  
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Started with</div>
                    <div className="text-2xl font-bold text-white">
                      $<AnimatedCounter value={fundPerformance.startingAmount} decimals={0} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      <AnimatedCounter 
                        value={fundPerformance.roi} 
                        decimals={1} 
                        suffix="%" 
                        prefix="+"
                      />
                    </div>
                    <div className="text-sm text-gray-400">Return on Investment</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      <AnimatedCounter 
                        value={fundPerformance.winRate} 
                        decimals={0} 
                        suffix="%"
                      />
                    </div>
                    <div className="text-sm text-gray-400">Win Rate</div>
                  </div>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-2">
                      $<AnimatedCounter 
                        value={fundPerformance.monthlyProfit} 
                        decimals={0} 
                        prefix="+"
                      />
                    </div>
                    <div className="text-sm text-gray-400">Monthly Profit</div>
                  </div>
                </div>
                
                {/* Simple animated chart representation */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-3">Performance Chart</div>
                  <div className="h-24 flex items-end justify-between gap-1">
                    {[10000, 10200, 10150, 10400, 10800, 11200, 11000, 11500, 12100, 12450].map((value, index) => (
                      <div 
                        key={index}
                        className="bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-1000 ease-out"
                        style={{ 
                          height: fundPerformance.isLoaded ? `${((value - 10000) / 2450) * 80 + 10}%` : '10%',
                          transitionDelay: `${index * 200}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center py-12">
          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-8">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Real Trading?</h2>
            <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Join thousands of profitable traders using AI-powered arbitrage detection and predictions.
              Get your first winning tips today for just $399.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="bg-white text-green-600 font-bold text-lg px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center gap-2 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Start Real Trading - $399
              </Link>
              
              <Link
                to="/login"
                className="text-white border-2 border-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white hover:text-green-600 transition-colors"
              >
                Already have an account?
              </Link>
            </div>
            
            <div className="mt-6 flex justify-center items-center gap-6 text-green-100 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                7-Day Free Trial
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Money Back Guarantee
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                24/7 Support
              </div>
            </div>
          </div>
        </section>

        {/* Demo Notice */}
        <div className="text-center py-8 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Demo Mode
            </span>
            • All data shown is simulated for demonstration purposes. Real platform requires registration and subscription.
          </p>
        </div>
      </div>
    </div>
  );
}