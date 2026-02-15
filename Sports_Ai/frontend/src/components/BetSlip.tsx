import { useState, useMemo } from 'react';
import { useBetSlipStore, BetSlipSelection } from '../store/betSlipStore';

function SlipSelection({ sel, onRemove }: { sel: BetSlipSelection; onRemove: () => void }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">
            {sel.eventName}
          </div>
          <div className="text-sm font-bold text-white mt-0.5 truncate">{sel.pick}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{sel.market}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-green-400 font-mono font-bold text-sm">
            {sel.odds.toFixed(2)}
          </span>
          <button
            onClick={onRemove}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {sel.bookmaker && (
        <div className="text-[9px] text-gray-600 mt-1">via {sel.bookmaker}</div>
      )}
    </div>
  );
}

export function BetSlip() {
  const { selections, mode, stake, isOpen, removeSelection, clearAll, toggleOpen, setMode, setStake } = useBetSlipStore();
  const [placing, setPlacing] = useState(false);

  const combinedOdds = useMemo(() => {
    if (mode === 'accumulator' && selections.length > 1) {
      return selections.reduce((acc, s) => acc * s.odds, 1);
    }
    return 0;
  }, [selections, mode]);

  const potentialReturn = useMemo(() => {
    if (mode === 'accumulator' && selections.length > 1) {
      return stake * combinedOdds;
    }
    // Singles: sum of individual returns
    return selections.reduce((acc, s) => acc + stake * s.odds, 0);
  }, [selections, mode, stake, combinedOdds]);

  const handlePlaceBet = async () => {
    setPlacing(true);
    // Simulated - in production this would call the strategy API
    await new Promise(r => setTimeout(r, 1500));
    setPlacing(false);
    clearAll();
  };

  if (selections.length === 0) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6 bg-green-600 hover:bg-green-500 text-white rounded-full p-4 shadow-2xl shadow-green-900/50 transition-all animate-bounce-slow"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selections.length}
            </span>
          </div>
        </button>
      )}

      {/* Bet Slip Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-96 sm:bottom-4 sm:right-4 sm:rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl shadow-black/80 flex flex-col max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎫</span>
              <h3 className="text-white font-bold text-sm">Bet Slip</h3>
              <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {selections.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
              >
                Clear All
              </button>
              <button
                onClick={toggleOpen}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          {selections.length > 1 && (
            <div className="flex gap-1 p-2 mx-3 mt-3 bg-gray-800 rounded-lg">
              <button
                onClick={() => setMode('single')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  mode === 'single' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Singles ({selections.length})
              </button>
              <button
                onClick={() => setMode('accumulator')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  mode === 'accumulator' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Accumulator
              </button>
            </div>
          )}

          {/* Selections */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
            {selections.map(sel => (
              <SlipSelection key={sel.id} sel={sel} onRemove={() => removeSelection(sel.id)} />
            ))}
          </div>

          {/* Stake & Return */}
          <div className="p-4 bg-gray-800/80 border-t border-gray-700 space-y-3">
            {/* Stake Input */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                Stake
              </label>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">$</span>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-green-500 transition-colors"
                  min="0"
                  step="5"
                />
              </div>
              <div className="flex gap-1">
                {[10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setStake(v)}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      stake === v ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    } transition-colors`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Combined Odds (accumulator) */}
            {mode === 'accumulator' && selections.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">Combined Odds</span>
                <span className="text-purple-400 font-mono font-bold">@{combinedOdds.toFixed(2)}</span>
              </div>
            )}

            {/* Potential Return */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">Potential Return</span>
              <span className="text-green-400 font-mono font-black text-lg">
                ${potentialReturn.toFixed(2)}
              </span>
            </div>

            {/* Place Bet Button */}
            <button
              onClick={handlePlaceBet}
              disabled={placing || stake <= 0}
              className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
            >
              {placing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Placing...</span>
                </>
              ) : (
                <>
                  <span>Place {mode === 'accumulator' && selections.length > 1 ? 'Accumulator' : `${selections.length} Bet${selections.length > 1 ? 's' : ''}`}</span>
                  <span className="text-green-300">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
