import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { api, ArbitrageLeg } from '../../services/api';
import { PremiumGate } from '../../components/PremiumGate';

interface DailyTicketMatch {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  analysis: { summary: string };
}

interface DailyTicket {
  id: string;
  name: string;
  actualOdds: number;
  totalConfidence: number;
  matches: DailyTicketMatch[];
}

interface StrangeBet {
  event: string;
  outcome: string;
  drop: string;
}

interface ArbitrageSummaryItem {
  id: string;
  sport: string;
  league: string;
  event: string;
  profit: number;
  legs?: ArbitrageLeg[];
}

interface ArbitrageSummaryResponse {
  opportunities?: ArbitrageSummaryItem[];
}

export function DailyAiPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'strange' | 'arbitrage'>('tickets');

  const { data: tickets } = useQuery<DailyTicket[]>({
    queryKey: ['dailyTickets'],
    queryFn: () => api.get('/v1/ai/tickets/daily').then(res => res.data),
  });

  const { data: strangeBets } = useQuery<StrangeBet[]>({
    queryKey: ['strangeBets'],
    queryFn: () => api.get('/v1/ai/strange-bets').then(res => res.data),
  });

  const { data: arbs } = useQuery<ArbitrageSummaryResponse>({
    queryKey: ['arbsSummary'],
    queryFn: () => api.get('/v1/arbitrage/opportunities?fullDetails=true').then(res => res.data),
  });

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Master Intelligence</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Real-time sports modeling, arbitrage detection, and institutional-grade betting insights powered by Llama 3 AI.
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-xl mb-8 w-fit border border-gray-700">
          {(['tickets', 'strange', 'arbitrage'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'tickets' && <span className="ml-2 px-1.5 py-0.5 bg-black/20 rounded text-[10px]">NEW</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Daily Tickets Section */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {tickets?.map((ticket) => (
                <div key={ticket.id} className="bg-gray-800 rounded-3xl p-8 border border-gray-700 hover:border-green-500/50 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{ticket.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500 font-mono font-bold">@{ticket.actualOdds} Target</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400 text-sm">{ticket.matches.length} Matches</span>
                      </div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-2xl">
                      <div className="text-xs text-green-500 font-bold uppercase tracking-wider mb-0.5">Confidence</div>
                      <div className="text-2xl font-black text-white">{ticket.totalConfidence}%</div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    {ticket.matches.map((match, idx) => (
                      <div key={idx} className="bg-gray-900/50 rounded-2xl p-5 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-white font-bold">{match.homeTeam} vs {match.awayTeam}</div>
                          <div className="text-green-500 font-bold">@{match.odds}</div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-3">
                          <span className="px-2 py-0.5 bg-gray-800 rounded">{match.league}</span>
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded font-bold">{match.prediction}</span>
                        </div>
                        <PremiumGate feature="AI Explanation">
                          <p className="text-sm text-gray-300 leading-relaxed italic">
                            "{match.analysis.summary}"
                          </p>
                        </PremiumGate>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl shadow-green-600/20 transition-all transform active:scale-95">
                    VIEW TICKET DETAILS
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Strange Bets / Anomalies Section */}
          {activeTab === 'strange' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {strangeBets?.length ? strangeBets.map((bet, i) => (
                <div key={i} className="bg-gray-800 rounded-3xl p-6 border border-purple-500/30 flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-3 py-1 bg-purple-500 text-white text-[10px] font-black rounded-full uppercase">Sharp Money Alert</span>
                      <span className="text-gray-500 text-xs">Detected 4m ago</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{bet.event}</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Significant volume spike on <span className="text-purple-400 font-bold">{bet.outcome}</span>. 
                      Odds plummeted <span className="text-green-500 font-black">{bet.drop}</span> in institutional markets.
                    </p>
                  </div>
                  <div className="w-full md:w-auto">
                    <button className="w-full px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all">
                      ANALYZE LINE
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-gray-800/50 rounded-3xl border border-dashed border-gray-700">
                  <p className="text-gray-500">No market anomalies detected in the last hour.</p>
                </div>
              )}
            </div>
          )}

          {/* Arbitrage Opportunities Section */}
          {activeTab === 'arbitrage' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {arbs?.opportunities?.map((arb) => (
                <div key={arb.id} className="bg-gray-800 rounded-3xl p-8 border border-blue-500/30 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase">Guaranteed Profit</span>
                      <span className="text-gray-400 text-sm font-medium">{arb.sport} • {arb.league}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">{arb.event}</h3>
                    <p className="text-gray-400 italic">"Market inefficiency detected between {arb.legs?.map((l) => l.bookmaker).join(' and ')}."</p>
                  </div>
                  <div className="text-center md:text-right flex-shrink-0">
                    <div className="text-4xl font-black text-green-500">+{arb.profit}%</div>
                    <div className="text-gray-500 text-sm font-bold mt-1 uppercase tracking-tighter">Net ROI</div>
                    <button 
                      onClick={() => window.location.href = `/arbitrage/${arb.id}`}
                      className="mt-6 px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 transition-all"
                    >
                      LOCK IN BET
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
