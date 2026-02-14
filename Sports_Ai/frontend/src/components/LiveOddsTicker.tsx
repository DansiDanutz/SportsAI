import { useState, useEffect, useRef } from 'react';

interface OddsEntry {
  id: number;
  sport: string;
  sportIcon: string;
  match: string;
  bookmaker1: string;
  bookmaker2: string;
  odds1: number;
  odds2: number;
  profit: number;
  timeAgo: string;
  type: 'arbitrage' | 'value' | 'prediction';
}

const SAMPLE_DATA: OddsEntry[] = [
  { id: 1, sport: 'Soccer', sportIcon: '⚽', match: 'Man City vs Arsenal', bookmaker1: 'Bet365', bookmaker2: 'William Hill', odds1: 2.10, odds2: 2.05, profit: 3.2, timeAgo: '2s ago', type: 'arbitrage' },
  { id: 2, sport: 'Tennis', sportIcon: '🎾', match: 'Djokovic vs Alcaraz', bookmaker1: 'Pinnacle', bookmaker2: 'Betfair', odds1: 1.85, odds2: 2.15, profit: 2.8, timeAgo: '5s ago', type: 'arbitrage' },
  { id: 3, sport: 'Basketball', sportIcon: '🏀', match: 'Lakers vs Celtics', bookmaker1: 'DraftKings', bookmaker2: 'FanDuel', odds1: 1.95, odds2: 2.00, profit: 1.9, timeAgo: '8s ago', type: 'value' },
  { id: 4, sport: 'Soccer', sportIcon: '⚽', match: 'Real Madrid vs Barcelona', bookmaker1: 'Betway', bookmaker2: 'Unibet', odds1: 2.30, odds2: 1.80, profit: 4.1, timeAgo: '12s ago', type: 'arbitrage' },
  { id: 5, sport: 'MMA', sportIcon: '🥊', match: 'UFC 310: Main Event', bookmaker1: 'BetMGM', bookmaker2: 'PointsBet', odds1: 2.50, odds2: 1.65, profit: 2.4, timeAgo: '15s ago', type: 'prediction' },
  { id: 6, sport: 'Soccer', sportIcon: '⚽', match: 'Bayern vs Dortmund', bookmaker1: 'Bet365', bookmaker2: 'Pinnacle', odds1: 1.75, odds2: 2.35, profit: 3.7, timeAgo: '18s ago', type: 'arbitrage' },
  { id: 7, sport: 'Tennis', sportIcon: '🎾', match: 'Sinner vs Medvedev', bookmaker1: 'Betfair', bookmaker2: 'William Hill', odds1: 1.90, odds2: 2.10, profit: 2.1, timeAgo: '22s ago', type: 'value' },
  { id: 8, sport: 'Basketball', sportIcon: '🏀', match: 'Warriors vs Bucks', bookmaker1: 'FanDuel', bookmaker2: 'DraftKings', odds1: 2.20, odds2: 1.85, profit: 3.5, timeAgo: '25s ago', type: 'arbitrage' },
];

const TYPE_COLORS = {
  arbitrage: { bg: 'bg-green-500/10', text: 'text-green-400', label: '🔒 Arb' },
  value: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '💎 Value' },
  prediction: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '🧠 AI Pick' },
};

export function LiveOddsTicker() {
  const [entries, setEntries] = useState<OddsEntry[]>(SAMPLE_DATA.slice(0, 5));
  const [totalProfit, setTotalProfit] = useState(847.20);
  const [alertCount, setAlertCount] = useState(142);
  const [flash, setFlash] = useState<number | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setEntries(prev => {
        const pool = SAMPLE_DATA;
        const newEntry = { 
          ...pool[Math.floor(Math.random() * pool.length)],
          id: Date.now(),
          profit: +(1.5 + Math.random() * 4).toFixed(1),
          timeAgo: 'just now',
          odds1: +(1.5 + Math.random() * 1.2).toFixed(2),
          odds2: +(1.5 + Math.random() * 1.2).toFixed(2),
        };
        setFlash(newEntry.id);
        setTimeout(() => setFlash(null), 800);
        setTotalProfit(p => +(p + newEntry.profit * 10).toFixed(2));
        setAlertCount(c => c + 1);
        return [newEntry, ...prev.slice(0, 4)];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 overflow-x-hidden">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm font-semibold tracking-wider uppercase">Live Feed</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-400">
          <span>Today: <span className="text-green-400 font-bold">{alertCount}</span> alerts</span>
          <span>Profit: <span className="text-green-400 font-bold">${totalProfit.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Ticker entries */}
      <div ref={tickerRef} className="space-y-2">
        {entries.map((entry) => {
          const typeStyle = TYPE_COLORS[entry.type];
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
                <div className="hidden sm:flex items-center space-x-1">
                  <span className="text-gray-400 text-xs">{entry.odds1}</span>
                  <span className="text-gray-600 text-xs">|</span>
                  <span className="text-gray-400 text-xs">{entry.odds2}</span>
                </div>

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
