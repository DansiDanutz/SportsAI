import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { GlowCard, Badge, ProgressRing } from '../../components/ui';

interface MatchAnalysis {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime: string;
  prediction: string;
  odds: number;
  confidence: number;
  analysis: {
    summary: string;
    factors: string[];
    riskLevel: 'low' | 'medium' | 'high';
    valueRating: number;
  };
  historicalData: {
    h2hHomeWins: number;
    h2hDraws: number;
    h2hAwayWins: number;
    homeFormLast5: string;
    awayFormLast5: string;
    homeGoalsAvg: number;
    awayGoalsAvg: number;
  };
}

interface DailyTicket {
  id: string;
  name: string;
  targetOdds: number;
  actualOdds: number;
  matches: MatchAnalysis[];
  totalConfidence: number;
  createdAt: string;
  isPremium: boolean;
}

export function DailyAiPage() {
  const { user } = useAuthStore();
  const isPremium = user?.subscriptionTier === 'premium';
  const [selectedTicket, setSelectedTicket] = useState<DailyTicket | null>(null);
  const [customOdds, setCustomOdds] = useState<string>('5');
  const [customRisk, setCustomRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // Fetch daily tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['daily-tips'],
    queryFn: async () => {
      const response = await api.get<{ tickets: DailyTicket[]; generatedAt: string }>('/v1/ai/daily-tips');
      return response.data;
    },
  });

  // Custom ticket mutation
  const customTicketMutation = useMutation({
    mutationFn: async (params: { targetOdds: number; riskLevel: string }) => {
      const response = await api.post<{ ticket: DailyTicket }>('/v1/ai/daily-tips/custom', params);
      return response.data;
    },
    onSuccess: (data) => {
      setSelectedTicket(data.ticket);
    },
  });

  const handleGenerateCustom = () => {
    const odds = parseFloat(customOdds);
    if (odds >= 1.1 && odds <= 100) {
      customTicketMutation.mutate({ targetOdds: odds, riskLevel: customRisk });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>
        ★
      </span>
    ));
  };

  const renderFormBadge = (form: string) => {
    return form.split('').map((char, i) => (
      <span
        key={i}
        className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${
          char === 'W' ? 'bg-green-500 text-white' :
          char === 'D' ? 'bg-yellow-500 text-black' :
          'bg-red-500 text-white'
        }`}
      >
        {char}
      </span>
    ));
  };

  const renderTicketCard = (ticket: DailyTicket, index: number) => (
    <GlowCard
      key={ticket.id}
      glowColor={selectedTicket?.id === ticket.id ? 'blue' : 'green'}
      variant={selectedTicket?.id === ticket.id ? 'gradient' : 'default'}
      className={`cursor-pointer animate-fade-in`}
      hover={selectedTicket?.id !== ticket.id}
    >
      <div onClick={() => setSelectedTicket(ticket)} style={{ animationDelay: `${index * 100}ms` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing
                value={ticket.totalConfidence}
                size="sm"
                color={ticket.totalConfidence >= 75 ? 'green' : ticket.totalConfidence >= 60 ? 'orange' : 'red'}
                showValue={false}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {ticket.matches.length}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{ticket.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={ticket.totalConfidence >= 75 ? 'success' : 'warning'} size="sm">
                  {ticket.totalConfidence}% conf
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent animate-pulse">
              {ticket.actualOdds.toFixed(2)}x
            </div>
            <div className="text-xs text-gray-400">Combined Odds</div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {ticket.matches.slice(0, 3).map((match, matchIndex) => (
            <div
              key={match.eventId}
              className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              style={{ animationDelay: `${matchIndex * 50}ms` }}
            >
              <span className="text-gray-300 truncate flex-1">
                {match.homeTeam} vs {match.awayTeam}
              </span>
              <Badge variant="success" size="sm" className="ml-2">
                {match.prediction}
              </Badge>
              <span className="text-gray-400 ml-2 font-mono">@{match.odds.toFixed(2)}</span>
            </div>
          ))}
          {ticket.matches.length > 3 && (
            <div className="text-gray-500 text-xs text-center py-1">
              +{ticket.matches.length - 3} more matches
            </div>
          )}
        </div>
      </div>
    </GlowCard>
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 animate-bounce-subtle">
                <span className="text-3xl">🎯</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Daily AI Tips</h1>
                <p className="text-gray-400 mt-1">
                  AI-curated betting tickets with comprehensive analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="success" glow>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Live Analysis
              </Badge>
              <Badge variant="info">
                Updated {ticketsData?.generatedAt ? new Date(ticketsData.generatedAt).toLocaleTimeString() : 'recently'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Tickets */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl font-semibold text-white">Today's Tickets</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : ticketsData?.tickets && ticketsData.tickets.length > 0 ? (
                <div className="space-y-4">
                  {ticketsData.tickets.map((ticket, index) => renderTicketCard(ticket, index))}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
                  <p>No tickets available. Check back later!</p>
                </div>
              )}

              {/* Custom Ticket Builder (Premium) */}
              <div className={`rounded-xl border p-6 ${isPremium ? 'bg-gradient-to-br from-purple-900/30 to-gray-800 border-purple-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">✨</span>
                  <h3 className="text-lg font-semibold text-white">Custom Ticket Builder</h3>
                  {!isPremium && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">PREMIUM</span>
                  )}
                </div>

                {isPremium ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">Target Odds</label>
                      <input
                        type="number"
                        min="1.1"
                        max="100"
                        step="0.1"
                        value={customOdds}
                        onChange={(e) => setCustomOdds(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., 5.0"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">Risk Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low', 'medium', 'high'] as const).map((risk) => (
                          <button
                            key={risk}
                            onClick={() => setCustomRisk(risk)}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                              customRisk === risk
                                ? risk === 'low' ? 'bg-green-600 text-white' :
                                  risk === 'medium' ? 'bg-yellow-600 text-black' :
                                  'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {risk.charAt(0).toUpperCase() + risk.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateCustom}
                      disabled={customTicketMutation.isPending}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition-colors"
                    >
                      {customTicketMutation.isPending ? 'Generating...' : 'Generate Custom Ticket'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Set your own target odds and let AI find the best matches for your ticket.
                    </p>
                    <Link
                      to="/credits"
                      className="inline-block px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                    >
                      Upgrade to Premium
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Match Details */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedTicket.name}</h2>
                      <p className="text-gray-400 text-sm">
                        {selectedTicket.matches.length} selections • {selectedTicket.totalConfidence}% confidence
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-green-400">{selectedTicket.actualOdds.toFixed(2)}x</div>
                      <div className="text-sm text-gray-400">Combined Odds</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedTicket.matches.map((match, index) => (
                      <div
                        key={match.eventId}
                        className="bg-gray-700/50 rounded-lg overflow-hidden"
                      >
                        {/* Match Header */}
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-700/80 transition-colors"
                          onClick={() => setExpandedMatch(expandedMatch === match.eventId ? null : match.eventId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-white font-medium">
                                  {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {match.league} • {formatDate(match.startTime)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-green-400 font-bold">{match.prediction}</div>
                                <div className="text-gray-400 text-sm">@{match.odds.toFixed(2)}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(match.analysis.riskLevel)}`}>
                                {match.analysis.riskLevel.toUpperCase()}
                              </div>
                              <svg
                                className={`w-5 h-5 text-gray-400 transition-transform ${expandedMatch === match.eventId ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Confidence & Value Bar */}
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>Confidence</span>
                                <span>{match.confidence}%</span>
                              </div>
                              <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    match.confidence >= 80 ? 'bg-green-500' :
                                    match.confidence >= 65 ? 'bg-yellow-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${match.confidence}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Value:</span>
                              <div className="flex">{renderStars(match.analysis.valueRating)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Analysis */}
                        {expandedMatch === match.eventId && (
                          <div className="border-t border-gray-600 p-4 space-y-4">
                            {/* Summary */}
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">AI Analysis</h4>
                              <p className="text-gray-300 text-sm">{match.analysis.summary}</p>
                            </div>

                            {/* Factors */}
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Key Factors</h4>
                              <ul className="space-y-2">
                                {match.analysis.factors.map((factor, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Historical Data */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <h5 className="text-xs text-gray-400 mb-2">{match.homeTeam} Form</h5>
                                <div className="flex gap-1">
                                  {renderFormBadge(match.historicalData.homeFormLast5)}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                  Avg Goals: {match.historicalData.homeGoalsAvg}
                                </div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <h5 className="text-xs text-gray-400 mb-2">{match.awayTeam} Form</h5>
                                <div className="flex gap-1">
                                  {renderFormBadge(match.historicalData.awayFormLast5)}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                  Avg Goals: {match.historicalData.awayGoalsAvg}
                                </div>
                              </div>
                            </div>

                            {/* H2H Stats */}
                            <div className="bg-gray-800/50 rounded-lg p-3">
                              <h5 className="text-xs text-gray-400 mb-2">Head to Head (Last 10)</h5>
                              <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-400">{match.historicalData.h2hHomeWins}</div>
                                  <div className="text-xs text-gray-400">{match.homeTeam}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-400">{match.historicalData.h2hDraws}</div>
                                  <div className="text-xs text-gray-400">Draws</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-400">{match.historicalData.h2hAwayWins}</div>
                                  <div className="text-xs text-gray-400">{match.awayTeam}</div>
                                </div>
                              </div>
                            </div>

                            {/* Link to Event */}
                            <Link
                              to={`/event/${match.eventId}`}
                              className="block w-full text-center py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              View Full Match Details
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Ticket Summary */}
                  <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-green-400">Potential Return on $10 Bet</div>
                        <div className="text-3xl font-bold text-white">${(10 * selectedTicket.actualOdds).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">AI Confidence Score</div>
                        <div className={`text-2xl font-bold ${
                          selectedTicket.totalConfidence >= 70 ? 'text-green-400' :
                          selectedTicket.totalConfidence >= 55 ? 'text-yellow-400' :
                          'text-orange-400'
                        }`}>
                          {selectedTicket.totalConfidence}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Ticket</h3>
                  <p className="text-gray-400">
                    Choose a ticket from the left to see detailed analysis for each match.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
