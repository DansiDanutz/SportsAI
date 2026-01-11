import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface PremiumGateProps {
  children: ReactNode;
  feature: string;
  showBlur?: boolean;
  showCount?: number;
}

export function PremiumGate({ children, feature, showBlur = true, showCount }: PremiumGateProps) {
  const { user } = useAuthStore();
  const isPremium = user?.subscriptionTier === 'premium';

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content preview */}
      {showBlur && (
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
      )}

      {/* Premium overlay */}
      <div className={`${showBlur ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
          <p className="text-gray-400 mb-4">
            {feature} is available for Premium subscribers only.
          </p>

          {showCount !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="text-3xl font-bold text-green-500">{showCount}</div>
              <div className="text-sm text-gray-400">opportunities available</div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to="/credits"
              className="block w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              Upgrade to Premium
            </Link>
            <p className="text-xs text-gray-500">
              Get unlimited access to all arbitrage details, AI insights, and advanced filters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PremiumBadgeProps {
  className?: string;
}

export function PremiumBadge({ className = '' }: PremiumBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/50 text-yellow-400 text-xs font-semibold rounded-full ${className}`}>
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
      </svg>
      PREMIUM
    </span>
  );
}

export function useIsPremium() {
  const { user } = useAuthStore();
  return user?.subscriptionTier === 'premium';
}
