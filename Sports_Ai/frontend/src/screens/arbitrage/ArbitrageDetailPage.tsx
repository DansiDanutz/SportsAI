import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PremiumGate, useIsPremium } from '../../components/PremiumGate';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAuthStore } from '../../store/authStore';
import { calculateArbitrageProfit, calculateStakes } from '../../utils/arbitrageUtils';
import { useArbitrage, useUnlockArbitrage } from '../../hooks/useArbitrage';

export function ArbitrageDetailPage() {
  const { arbId } = useParams<{ arbId: string }>();
  const navigate = useNavigate();
  const isPremium = useIsPremium();
  const { user, updateUser } = useAuthStore();

  const { data: arbitrageData, isLoading } = useArbitrage(isPremium);
  const unlockMutation = useUnlockArbitrage();

  const [unlockError, setUnlockError] = useState<{
    message: string;
    required: number;
    available: number;
  } | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // Find the specific arbitrage opportunity
  const arb = arbitrageData?.opportunities?.find(a => a.id === arbId);

  const handleUnlockConfirm = async () => {
    if (!arb) return;
    
    try {
      const result = await unlockMutation.mutateAsync(arb.id);
      
      if (result.success) {
        updateUser({ creditBalance: result.newBalance });
        setUnlockSuccess(true);
        setTimeout(() => {
          setShowUnlockDialog(false);
          setUnlockSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      setUnlockError({
        message: errorData?.message || 'Failed to unlock. Please try again.',
        required: errorData?.required || arb.creditCost || 10,
        available: errorData?.available || user?.creditBalance || 0,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  const calculatedProfit = arb ? calculateArbitrageProfit(arb.legs) : 0;
  const stakes = arb ? calculateStakes(arb.legs, 100) : [];
  const totalReturn = stakes.length > 0 ? stakes[0].potentialReturn : 0;
  const actualProfit = Math.round((totalReturn - 100) * 100) / 100;

  const confidenceLevel = arb ? (arb.confidence >= 0.95 ? 'high' : arb.confidence >= 0.85 ? 'medium' : 'low') : 'low';
  const confidenceColors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    low: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  };

  const handleBuyCredits = () => {
    setShowUnlockDialog(false);
    navigate('/credits');
  };

  if (!arb) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Opportunity Not Found</h1>
          <p className="text-gray-400 mb-8">This arbitrage opportunity may have expired or doesn't exist.</p>
          <Link
            to="/arbitrage"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors inline-block"
          >
            View All Opportunities
          </Link>
        </div>
      </Layout>
    );
  }

  // Non-premium users see the paywall
  if (!isPremium) {
    return (
      <Layout>
        <div className="p-8">
          <Link to="/arbitrage" className="text-gray-400 hover:text-white mb-6 inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Arbitrage
          </Link>

          <div className="mt-6">
            <h1 className="text-3xl font-bold text-white mb-2">{arb.event}</h1>
            <p className="text-gray-400">{arb.sport} - {arb.league}</p>
          </div>

          <div className="mt-8">
            <PremiumGate feature="Arbitrage opportunity details" showBlur={false}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                <p className="text-gray-400">Premium content placeholder</p>
              </div>
            </PremiumGate>
          </div>
        </div>
      </Layout>
    );
  }

  // Premium users - show content or unlock prompt
  const isUnlocked = arb.isUnlocked || arb.legs.length > 0;
  const showFullDetails = isUnlocked || !arb.isWinningTip;

  return (
    <Layout>
      <div className="p-8">
        {/* Back link */}
        <Link to="/arbitrage" className="text-gray-400 hover:text-white mb-6 inline-flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Arbitrage
        </Link>

        {/* Header */}
        <div className="mt-6 flex items-start justify-between">
          <div>
            {arb.isWinningTip && (
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Winning Tip
                </span>
                {isUnlocked ? (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">{arb.creditCost} credits to unlock</span>
                )}
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">{arb.event}</h1>
            <p className="text-gray-400 mt-1">{arb.sport} - {arb.league}</p>
            <p className="text-gray-500">{arb.market}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-green-500">+{calculatedProfit.toFixed(2)}%</div>
            <div className="text-gray-400 mt-1">Starts in {arb.timeLeft}</div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${confidenceColors[confidenceLevel]}`}>
              {(arb.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Content - locked or unlocked */}
        <div className="mt-8">
          {showFullDetails ? (
            <>
              {/* Full betting details */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recommended Bets (for $100 total stake)</h2>
                <div className={`grid grid-cols-1 ${arb.legs.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                  {arb.legs.map((leg, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4" data-testid={`leg-${index}`}>
                      <div className="text-white font-medium">{leg.outcome}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-2xl font-bold text-green-500">{leg.odds.toFixed(2)}</span>
                        <span className="text-sm text-gray-400">{leg.bookmaker}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Stake:</span>
                          <span className="text-white font-medium">${stakes[index]?.stake.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-400">Returns:</span>
                          <span className="text-green-400 font-medium">${stakes[index]?.potentialReturn.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Stake:</span>
                    <span className="text-white font-semibold">$100.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300">Guaranteed Return:</span>
                    <span className="text-green-400 font-semibold">${totalReturn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300">Guaranteed Profit:</span>
                    <span className="text-green-400 font-bold text-lg">${actualProfit.toFixed(2)} ({calculatedProfit.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>

              {/* Additional tips */}
              <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Strategy Tips</h2>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Place all bets within a short time window to avoid odds changes
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verify odds haven't changed before placing each bet
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Consider account limits at each bookmaker
                  </li>
                </ul>
              </div>
            </>
          ) : (
            /* Locked state - show unlock prompt */
            <div className="bg-gray-800 border border-yellow-500/50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unlock This Winning Tip</h2>
              <p className="text-gray-400 mb-6">
                Get the full betting strategy with exact stakes and bookmaker recommendations.
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-xl font-bold text-white">{arb.creditCost || 10} credits</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Your balance:</span>
                  <span className="text-white">{user?.creditBalance || 0} credits</span>
                </div>
              </div>

              <button
                onClick={() => setShowUnlockDialog(true)}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                Unlock Now ({arb.creditCost || 10} credits)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unlock Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUnlockDialog}
        onClose={() => {
          setShowUnlockDialog(false);
          setUnlockError(null);
          setUnlockSuccess(false);
        }}
        onConfirm={unlockError ? handleBuyCredits : handleUnlockConfirm}
        title={unlockSuccess ? "Tip Unlocked!" : unlockError ? "Insufficient Credits" : "Confirm Unlock"}
        message={
          unlockSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium">Successfully unlocked!</p>
              <p className="text-gray-400 text-sm mt-1">Full betting strategy is now available.</p>
            </div>
          ) : unlockError ? (
            <div>
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400">{unlockError.message}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Required credits:</span>
                  <span className="text-white font-medium">{unlockError.required}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your balance:</span>
                  <span className="text-red-400 font-medium">{unlockError.available}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Credits needed:</span>
                  <span className="text-yellow-400 font-medium">{unlockError.required - unlockError.available}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4">Are you sure you want to unlock this tip?</p>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-xl font-bold text-white">{arb.creditCost || 10} credits</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Balance after:</span>
                  <span className="text-white">{(user?.creditBalance || 0) - (arb.creditCost || 10)} credits</span>
                </div>
              </div>
            </div>
          )
        }
        confirmText={unlockSuccess ? '' : unlockError ? 'Buy More Credits' : 'Unlock'}
        cancelText={unlockSuccess ? 'Close' : 'Cancel'}
        variant={unlockError ? 'warning' : 'info'}
        isLoading={unlockMutation.isPending}
      />
    </Layout>
  );
}
