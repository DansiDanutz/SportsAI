import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';

interface Event {
  id: string;
  sport: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  league: string;
}

interface MatchPrediction {
  eventId: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  confidence: number;
  reasoning: string;
  valueBets: Array<{
    outcome: string;
    aiProb: number;
    bookmakerProb: number;
    value: number;
  }>;
}

interface SentimentData {
  eventId: string;
  publicSentiment: {
    homePercent: number;
    awayPercent: number;
    drawPercent: number;
  };
  sharpVsPublic: {
    homeSharpMoney: number;
    awaySharpMoney: number;
    publicMoney: number;
  };
  keyFactors: string[];
  sentimentScore: number; // -1 to 1, where -1 is very negative, 1 is very positive
}

interface AiTip {
  id: string;
  match: string;
  tip: string;
  confidence: number;
  reasoning: string;
  sport: string;
  expectedRoi: number;
  createdAt: string;
}

interface SmartAlert {
  id: string;
  type: 'odds_shift' | 'arbitrage_opportunity' | 'ai_high_confidence';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  eventId?: string;
  createdAt: string;
}

const SPORTS = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'baseball', name: 'Baseball', icon: '⚾' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
];

export function AiInsightsPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch upcoming events for match predictor
  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const response = await api.get<{ events: Event[] }>('/v1/events/upcoming?limit=50');
      return response.data.events;
    },
  });

  // Fetch AI daily tips
  const { data: dailyTips, isLoading: tipsLoading } = useQuery({
    queryKey: ['ai-daily-tips'],
    queryFn: async () => {
      const response = await api.get<{ tips: AiTip[] }>('/v1/ai/daily-tips');
      return response.data.tips;
    },
  });

  // Fetch smart alerts
  const { data: smartAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: async () => {
      const response = await api.get<{ alerts: SmartAlert[] }>('/v1/alerts?limit=20');
      return response.data.alerts;
    },
  });

  // Fetch prediction for selected event
  const { data: prediction, isPending: predictionLoading, mutate: fetchPrediction } = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post<MatchPrediction>(`/v1/ai/predict/${eventId}`);
      return response.data;
    },
  });

  // Fetch sentiment for selected event
  const { data: sentiment, isLoading: sentimentLoading } = useQuery({
    queryKey: ['ai-sentiment', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return null;
      const response = await api.get<SentimentData>(`/v1/ai/sentiment/${selectedEvent.id}`);
      return response.data;
    },
    enabled: !!selectedEvent?.id,
  });

  const handlePredictMatch = () => {
    if (selectedEvent) {
      fetchPrediction(selectedEvent.id);
    }
  };

  const getSportIcon = (sportKey: string) => {
    const sport = SPORTS.find((s) => s.key === sportKey);
    return sport?.icon || '🏆';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
      case 'low': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      default: return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    }
  };

  // Filter events based on search query
  const filteredEvents = upcomingEvents?.filter(event =>
    event.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.league.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">AI Insights</h1>
            <p className="text-gray-400 mt-2">AI-powered predictions, sentiment analysis, and smart alerts</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Match Predictor & Sentiment */}
            <div className="xl:col-span-2 space-y-6">
              {/* AI Match Predictor Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  🎯 AI Match Predictor
                </h2>
                
                {/* Match Search/Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search & Select Match
                  </label>
                  <input
                    type="text"
                    placeholder="Search teams or leagues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {/* Events Dropdown */}
                  {searchQuery && (
                    <div className="mt-2 max-h-60 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg">
                      {eventsLoading ? (
                        <div className="p-4 text-gray-400">Loading events...</div>
                      ) : filteredEvents.length > 0 ? (
                        filteredEvents.slice(0, 10).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => {
                              setSelectedEvent(event);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-3 hover:bg-gray-600 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{getSportIcon(event.sportKey)}</span>
                                <span className="text-white font-medium">
                                  {event.homeTeam} vs {event.awayTeam}
                                </span>
                              </div>
                              <div className="text-gray-400 text-sm">{event.league}</div>
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(event.startTime).toLocaleDateString()}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-gray-400">No events found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Match */}
                {selectedEvent && (
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getSportIcon(selectedEvent.sportKey)}</span>
                        <span className="text-white font-medium">
                          {selectedEvent.homeTeam} vs {selectedEvent.awayTeam}
                        </span>
                      </div>
                      <button
                        onClick={handlePredictMatch}
                        disabled={predictionLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
                      >
                        {predictionLoading ? 'Predicting...' : 'Predict'}
                      </button>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {selectedEvent.league} • {new Date(selectedEvent.startTime).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Prediction Results */}
                {prediction && selectedEvent && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Prediction Results</h3>
                    
                    {/* Win Probabilities */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                        <div className="text-white font-medium">{selectedEvent.homeTeam}</div>
                        <div className="text-2xl font-bold text-green-400 mt-1">
                          {(prediction.homeWinProb * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                        <div className="text-white font-medium">Draw</div>
                        <div className="text-2xl font-bold text-yellow-400 mt-1">
                          {(prediction.drawProb * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                        <div className="text-white font-medium">{selectedEvent.awayTeam}</div>
                        <div className="text-2xl font-bold text-blue-400 mt-1">
                          {(prediction.awayWinProb * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Confidence & Reasoning */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">AI Confidence</span>
                        <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
                          {prediction.confidence}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            prediction.confidence >= 85 ? 'bg-green-500' :
                            prediction.confidence >= 70 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${prediction.confidence}%` }}
                        />
                      </div>
                      <div className="mt-3">
                        <span className="text-gray-400 text-sm">Reasoning:</span>
                        <p className="text-gray-300 mt-1">{prediction.reasoning}</p>
                      </div>
                    </div>

                    {/* Value Bets */}
                    {prediction.valueBets && prediction.valueBets.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-white mb-2">💰 Value Bets Detected</h4>
                        <div className="space-y-2">
                          {prediction.valueBets.map((bet, index) => (
                            <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-white font-medium">{bet.outcome}</span>
                                <span className="text-green-400 font-bold">+{bet.value.toFixed(1)}% Value</span>
                              </div>
                              <div className="text-gray-400 text-sm mt-1">
                                AI: {(bet.aiProb * 100).toFixed(1)}% • Bookmaker: {(bet.bookmakerProb * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sentiment Analysis Section */}
              {selectedEvent && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    📊 Sentiment Analysis
                  </h2>
                  
                  {sentimentLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-400 mt-2">Analyzing sentiment...</p>
                    </div>
                  ) : sentiment ? (
                    <div className="space-y-6">
                      {/* Public Sentiment Gauge */}
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">Public Sentiment</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">{selectedEvent.homeTeam}</div>
                            <div className="text-2xl font-bold text-white mt-1">
                              {sentiment.publicSentiment.homePercent.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">Draw</div>
                            <div className="text-2xl font-bold text-white mt-1">
                              {sentiment.publicSentiment.drawPercent.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">{selectedEvent.awayTeam}</div>
                            <div className="text-2xl font-bold text-white mt-1">
                              {sentiment.publicSentiment.awayPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sharp vs Public Money */}
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">Sharp vs Public Money</h3>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-gray-400 text-sm">Sharp Money ({selectedEvent.homeTeam})</div>
                              <div className="text-green-400 font-bold text-lg">
                                {sentiment.sharpVsPublic.homeSharpMoney.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400 text-sm">Sharp Money ({selectedEvent.awayTeam})</div>
                              <div className="text-green-400 font-bold text-lg">
                                {sentiment.sharpVsPublic.awaySharpMoney.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-center">
                            <div className="text-gray-400 text-sm">Public Money</div>
                            <div className="text-blue-400 font-bold text-lg">
                              {sentiment.sharpVsPublic.publicMoney.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sentiment Score */}
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">Overall Sentiment</h3>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Market Sentiment</span>
                            <span className={`font-bold ${
                              sentiment.sentimentScore > 0.3 ? 'text-green-400' :
                              sentiment.sentimentScore < -0.3 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {sentiment.sentimentScore > 0.3 ? 'Bullish' :
                               sentiment.sentimentScore < -0.3 ? 'Bearish' : 'Neutral'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${
                                sentiment.sentimentScore > 0.3 ? 'bg-green-500' :
                                sentiment.sentimentScore < -0.3 ? 'bg-red-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.abs(sentiment.sentimentScore) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Key Factors */}
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">Key Factors</h3>
                        <div className="space-y-2">
                          {sentiment.keyFactors.map((factor, index) => (
                            <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                              <span className="text-gray-300">• {factor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-4">📊</div>
                      <p>Select a match to view sentiment analysis</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - AI Tips & Smart Alerts */}
            <div className="space-y-6">
              {/* AI Tips Feed */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  🤖 AI Tips Feed
                </h2>
                
                {tipsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : dailyTips && dailyTips.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {dailyTips.map((tip) => (
                      <div key={tip.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{getSportIcon(tip.sport)}</span>
                            <span className="text-white font-medium truncate">{tip.match}</span>
                          </div>
                          <span className="text-green-400 font-semibold text-sm">
                            +{tip.expectedRoi}% ROI
                          </span>
                        </div>
                        <div className="text-blue-400 text-sm font-medium mb-2">{tip.tip}</div>
                        <p className="text-gray-300 text-sm mb-3">{tip.reasoning}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400 text-xs">Confidence:</span>
                            <span className={`text-xs font-medium ${getConfidenceColor(tip.confidence)}`}>
                              {tip.confidence}%
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            {new Date(tip.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-4">🤖</div>
                    <p>No AI tips available today</p>
                  </div>
                )}
              </div>

              {/* Smart Alerts Panel */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  🚨 Smart Alerts
                </h2>
                
                {alertsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : smartAlerts && smartAlerts.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {smartAlerts.map((alert) => (
                      <div key={alert.id} className={`rounded-lg p-4 border ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{alert.title}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                            alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{alert.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {alert.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-4">🚨</div>
                    <p>No alerts at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}