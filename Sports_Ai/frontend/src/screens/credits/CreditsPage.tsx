import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface SelectedPackage {
  credits: number;
  price: number;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'unlock' | 'refund';
  amount: number;
  description?: string;
  timestamp: string;
  opportunity?: {
    event?: {
      home?: { name: string };
      away?: { name: string };
    };
  };
}

export function CreditsPage() {
  const { user, updateUser } = useAuthStore();
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/v1/credits/history');
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchTransactions();
  }, [purchaseSuccess]); // Refetch after purchase

  const handlePurchaseConfirm = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    try {
      const response = await api.post('/v1/credits/purchase', {
        credits: selectedPackage.credits,
        price: selectedPackage.price,
      });

      if (response.data.success) {
        // Update user's credit balance in the store
        updateUser({ creditBalance: response.data.newBalance });
        setPurchaseSuccess(true);
        setSelectedPackage(null);
        setTimeout(() => setPurchaseSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Credits</h1>
          <p className="text-gray-400 mt-2">
            Purchase credits to unlock Winning Tips
          </p>
        </div>

        {/* Purchase Success Message */}
        {purchaseSuccess && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6 flex items-center">
            <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-green-400 font-medium">Purchase Successful!</div>
              <div className="text-green-300 text-sm">Your credits have been added to your account.</div>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-200 text-sm">Current Balance</div>
              <div className="text-4xl font-bold text-white mt-1">
                {user?.creditBalance || 0} Credits
              </div>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <h2 className="text-xl font-semibold text-white mb-4">Buy Credit Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <CreditPackage
            credits={50}
            price={4.99}
            perCredit={0.10}
            onPurchase={() => setSelectedPackage({ credits: 50, price: 4.99 })}
          />
          <CreditPackage
            credits={150}
            price={12.99}
            perCredit={0.087}
            popular
            onPurchase={() => setSelectedPackage({ credits: 150, price: 12.99 })}
          />
          <CreditPackage
            credits={400}
            price={29.99}
            perCredit={0.075}
            savings={20}
            onPurchase={() => setSelectedPackage({ credits: 400, price: 29.99 })}
          />
          <CreditPackage
            credits={1000}
            price={59.99}
            perCredit={0.06}
            savings={40}
            bestValue
            onPurchase={() => setSelectedPackage({ credits: 1000, price: 59.99 })}
          />
        </div>

        {/* Transaction History */}
        <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No transactions yet</p>
              <p className="text-gray-500 text-sm">Purchase credits to get started!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Description</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => {
                  // Build description from opportunity data if available
                  const description = tx.description ||
                    (tx.opportunity?.event?.home && tx.opportunity?.event?.away
                      ? `${tx.opportunity.event.home.name} vs ${tx.opportunity.event.away.name}`
                      : tx.type === 'purchase' ? 'Credit package purchase' : 'Winning Tip unlock');

                  return (
                    <tr key={tx.id} className={index < transactions.length - 1 ? 'border-b border-gray-700/50' : ''}>
                      <td className="p-4 text-gray-300">
                        {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                          tx.type === 'refund' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">{description}</td>
                      <td className={`p-4 text-right font-medium ${
                        tx.type === 'unlock' ? 'text-red-400' : 'text-green-500'
                      }`}>
                        {tx.amount < 0 ? '' : '+'}{tx.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={selectedPackage !== null}
        onClose={() => setSelectedPackage(null)}
        onConfirm={handlePurchaseConfirm}
        title="Confirm Purchase"
        message={
          selectedPackage ? (
            <div>
              <p>You are about to purchase:</p>
              <div className="bg-gray-700/50 rounded-lg p-4 my-4">
                <div className="text-2xl font-bold text-white">{selectedPackage.credits} Credits</div>
                <div className="text-gray-400 mt-1">${selectedPackage.price.toFixed(2)}</div>
              </div>
              <p className="text-sm">Your payment will be processed securely.</p>
            </div>
          ) : ''
        }
        confirmText="Complete Purchase"
        cancelText="Cancel"
        variant="info"
        isLoading={isPurchasing}
      />
    </Layout>
  );
}

interface CreditPackageProps {
  credits: number;
  price: number;
  perCredit: number;
  popular?: boolean;
  savings?: number;
  bestValue?: boolean;
  onPurchase: () => void;
}

function CreditPackage({ credits, price, perCredit, popular, savings, bestValue, onPurchase }: CreditPackageProps) {
  return (
    <div className={`relative bg-gray-800 rounded-xl border ${
      popular ? 'border-green-500' : bestValue ? 'border-yellow-500' : 'border-gray-700'
    } p-6 hover:border-opacity-80 transition-colors`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
            Most Popular
          </span>
        </div>
      )}
      {bestValue && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-semibold rounded-full">
            Best Value
          </span>
        </div>
      )}

      <div className="text-center">
        <div className="text-4xl font-bold text-white">{credits}</div>
        <div className="text-gray-400 text-sm">Credits</div>

        <div className="mt-4">
          <span className="text-2xl font-bold text-white">${price.toFixed(2)}</span>
        </div>
        <div className="text-gray-500 text-xs mt-1">
          ${perCredit.toFixed(3)} per credit
        </div>

        {savings && (
          <div className="mt-2">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
              Save {savings}%
            </span>
          </div>
        )}

        <button
          onClick={onPurchase}
          className={`w-full mt-4 py-3 rounded-lg font-semibold transition-colors ${
            popular || bestValue
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          Purchase
        </button>
      </div>
    </div>
  );
}
