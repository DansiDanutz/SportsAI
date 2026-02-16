import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

interface OddsEntry {
  id: string | number;
  sport: string;
  sportIcon: string;
  match: string;
  bookmaker1: string;
  bookmaker2: string;
  profit: number;
  timeAgo: string;
  type: 'arbitrage' | 'value' | 'prediction';
}

const FALLBACK_DATA: OddsEntry[] = [
  { id: 1, sport: 'Soccer', sportIcon: '⚽', match: 'Man City vs Arsenal', bookmaker1: 'Bet365', bookmaker2: 'William Hill', profit: 3.2, timeAgo: '2s ago', type: 'arbitrage' },
  { id: 2, sport: 'Tennis', sportIcon: '🎾', match: 'Djokovic vs Alcaraz', bookmaker1: 'Pinnacle', bookmaker2: 'Betfair', profit: 2.8, timeAgo: '5s ago', type: 'arbitrage' },
  { id: 3, sport: 'Basketball', sportIcon: '🏀', match: 'Lakers vs Celtics', bookmaker1: 'DraftKings', bookmaker2: 'FanDuel', profit: 1.9, timeAgo: '8s ago', type: 'value' },
  { id: 4, sport: 'Soccer', sportIcon: '⚽', match: 'Real Madrid vs Barcelona', bookmaker1: 'Betway', bookmaker2: 'Unibet', profit: 4.1, timeAgo: '12s ago', type: 'arbitrage' },
  { id: 5, sport: 'MMA', sportIcon: '🥊', match: 'UFC 310: Main Event', bookmaker1: 'BetMGM', bookmaker2: 'PointsBet', profit: 2.4, timeAgo: '15s ago', type: 'prediction' },
];

const TYPE_COLORS = {
  arbitrage: { bg: 'bg-green-500/10', text: 'text-green-400', label: '🔒 Arb' },
  value: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '💎 Value' },
  prediction: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '🧠 AI Pick' },
};

export function LiveOddsTicker() {
  const [entries, setEntries] = useState<OddsEntry[]>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [flash, setFlash] = useState<string | number | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await api.get('/v1/arbitrage/recent');
      const data: OddsEntry[] = res.data;
      if (data && data.length > 0) {
        setEntries(data.slice(0, 5));
        setIsLive(true);
        // Flash the first entry
        setFlash(data[0].id);
        setTimeout(() => setFlash(null), 800);
      }
    } catch {
      // Keep fallback data — no-op
    }
  }, []);

  useEffect(() => {
    fetchRecent();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecent, 30_000);
    return () => clearInterval(interval);
  }, [fetchRecent]);

  const alertCount = entries.length;
  const bestProfit = entries.length > 0 ? Math.max(...entries.map(e => e.profit)) : 0;

  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 overflow-x-hidden">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isLive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className={`text-sm font-semibold tracking-wider uppercase ${isLive ? 'text-green-400' : 'text-yellow-400'}`}>
            {isLive ? 'Live Feed' : 'Demo Feed'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-400">
          <span>Found: <span className="text-green-400 font-bold">{alertCount}</span> opportunities</span>
          <span>Best: <span className="text-green-400 font-bold">+{bestProfit.toFixed(1)}%</span></span>
        </div>
      </div>

      {/* Ticker entries */}
      <div ref={tickerRef} className="space-y-2">
        {entries.map((entry) => {
          const typeStyle = TYPE_COLORS[entry.type] || TYPE_COLORS.value;
          const isNew = entry.id === flash;
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-500 ${
                isNew
                  ? 'bg-green-500/10 border-green-500/40 shadow-lg shadow-green-500/10'
                  : 'bg-gray-800/60 border-gray-700/30'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0">{entry.sportIcon}</span>
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">{entry.match}</div>
                  <div className="text-gray-500 text-xs truncate">
                    {entry.bookmaker1} vs {entry.bookmaker2}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                  {typeStyle.label}
                </span>

                <span className={`text-sm font-bold ${entry.profit >= 3 ? 'text-green-400' : 'text-green-300'}`}>
                  +{entry.profit}%
                </span>

                <span className="text-gray-600 text-xs w-14 text-right">{entry.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Blur overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
    </div>
  );
}
