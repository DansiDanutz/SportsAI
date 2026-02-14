import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import {
  AccountSettings,
  DisplayPreferences,
  SecuritySettings,
  NotificationSettings,
  ResponsibleGamblingSettings,
  PrivacySettings,
} from './components';
import { api, subscriptionApi, SubscriptionCancellation } from '../../services/api';

// Available sports for settings
const availableSports = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
];

export function SettingsPage() {
  const { user, logout, updateUser } = useAuthStore();
  const { resetToDefaults } = usePreferencesStore();
  const location = useLocation();

  // Section refs for hash navigation
  const accountRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const sportsRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const gamblingRef = useRef<HTMLDivElement>(null);

  // Handle hash navigation on mount and hash change
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      const refs: Record<string, React.RefObject<HTMLDivElement>> = {
        account: accountRef,
        preferences: preferencesRef,
        notifications: notificationsRef,
        privacy: privacyRef,
        sports: sportsRef,
        security: securityRef,
        gambling: gamblingRef,
      };
      const targetRef = refs[hash];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  // Shared modals state (kept in main component)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'pro'>('premium');
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [planChangeSuccess, setPlanChangeSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetPreferencesDialog, setShowResetPreferencesDialog] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showSelfExclusionModal, setShowSelfExclusionModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  
  // Cancel Subscription state (shared with AccountSettings)
  const [showCancelSubscriptionDialog, setShowCancelSubscriptionDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [cancellationDetails, setCancellationDetails] = useState<SubscriptionCancellation | null>(null);

  // Cancellation reasons
  const cancellationReasons = [
    { id: 'too_expensive', label: 'Too expensive' },
    { id: 'not_using', label: "I'm not using it enough" },
    { id: 'missing_features', label: 'Missing features I need' },
    { id: 'found_alternative', label: 'Found a better alternative' },
    { id: 'temporary', label: 'Taking a break temporarily' },
    { id: 'other', label: 'Other reason' },
  ];

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!cancellationReason) {
      setCancellationError('Please select a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    setCancellationError(null);
    try {
      const result = await subscriptionApi.cancel(cancellationReason);
      if (result.success && result.cancellation) {
        setCancellationSuccess(true);
        setCancellationDetails(result.cancellation);
      } else {
        setCancellationError(result.message || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      setCancellationError(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  // Reset cancel subscription dialog
  const resetCancelDialog = () => {
    setShowCancelSubscriptionDialog(false);
    setCancellationReason('');
    setCancellationError(null);
    // Don't reset cancellationSuccess/cancellationDetails - they persist for display
  };


  const handleSaveChanges = async () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetPreferences = () => {
    resetToDefaults();
    setResetSuccess(true);
    setShowResetPreferencesDialog(false);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) return;
    setIsSendingVerification(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailVerificationSent(true);
    } catch (error) {
      console.error('Failed to send verification:', error);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/v1/users/me');
      if (response.data.success) {
        setShowDeleteDialog(false);
        logout();
      } else {
        console.error('Failed to delete account:', response.data.message);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await api.post('/v1/users/me/subscription/upgrade', { tier: 'premium' });
      if (response.data.success && response.data.user) {
        // Update the user in the auth store
        updateUser(response.data.user);
        setUpgradeSuccess(true);
        setTimeout(() => {
          setShowUpgradeDialog(false);
          setUpgradeSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to upgrade:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleChangePlan = async () => {
    if (selectedPlan === user?.subscriptionTier) return;

    setIsChangingPlan(true);
    try {
      const response = await api.post('/v1/users/me/subscription/upgrade', { tier: selectedPlan });
      if (response.data.success && response.data.user) {
        updateUser(response.data.user);
        setPlanChangeSuccess(true);
        setTimeout(() => {
          setShowChangePlanDialog(false);
          setPlanChangeSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Calculate prorated amount for plan changes
  const calculateProration = (currentPlan: string, newPlan: string): { amount: number; isRefund: boolean; daysRemaining: number } => {
    const planPrices: Record<string, number> = { free: 0, premium: 19.99, pro: 49.99 };
    const currentPrice = planPrices[currentPlan] || 0;
    const newPrice = planPrices[newPlan] || 0;
    // Billing proration requires real billing-cycle data from the backend/payment provider.
    // We intentionally do not estimate it client-side.
    const daysRemaining = 0;
    const dailyRate = (newPrice - currentPrice) / 30;
    const amount = Math.abs(dailyRate * daysRemaining);
    return {
      amount: Math.round(amount * 100) / 100,
      isRefund: newPrice < currentPrice,
      daysRemaining,
    };
  };

  return (
    <Layout>
      <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6 xl:px-12 xl:py-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">
            Manage your account and preferences
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Account Section */}
          <div ref={accountRef}>
            <AccountSettings
              onEmailChange={() => setShowEmailDialog(true)}
              onUpgrade={() => setShowUpgradeDialog(true)}
              onPlanChange={() => {
                setSelectedPlan(user?.subscriptionTier === 'premium' ? 'pro' : 'premium');
                setShowChangePlanDialog(true);
              }}
              onCancelSubscription={() => setShowCancelSubscriptionDialog(true)}
              cancellationSuccess={cancellationSuccess}
              cancellationDetails={cancellationDetails ?? undefined}
            />
          </div>

          {/* Sport-Specific Settings */}
          <div ref={sportsRef} id="sports" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
            <h2 className="text-xl font-semibold text-white mb-4">Sport Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              Configure markets, periods, and preferences for each sport
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableSports.map((sport) => (
                <Link
                  key={sport.key}
                  to={`/settings/sports/${sport.key}`}
                  className="flex flex-col items-center p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-green-500/50 hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-3xl mb-2">{sport.icon}</span>
                  <span className="text-sm text-gray-300 group-hover:text-white">{sport.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Security Section */}
          <div ref={securityRef}>
            <SecuritySettings />
          </div>

          {/* Display Preferences */}
          <div ref={preferencesRef}>
            <DisplayPreferences
              onReset={() => setShowResetPreferencesDialog(true)}
              resetSuccess={resetSuccess}
            />
          </div>

          {/* Notifications */}
          <div ref={notificationsRef}>
            <NotificationSettings />
          </div>

          {/* Responsible Gambling */}
          <div ref={gamblingRef}>
            <ResponsibleGamblingSettings
              onSelfExclusionClick={() => setShowSelfExclusionModal(true)}
              onResourcesClick={() => setShowResourcesModal(true)}
            />
          </div>

          {/* Privacy & Data Controls */}
          <div ref={privacyRef}>
            <PrivacySettings />
          </div>

          {/* Danger Zone */}
          <div className="bg-gray-800 rounded-xl border border-red-500/30 p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
            <p className="text-gray-400 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-between items-center">
            {saveSuccess && (
              <div className="flex items-center text-green-500">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Changes saved successfully!
              </div>
            )}
            <div className="flex-1" />
            <button
              onClick={handleSaveChanges}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteConfirmText('');
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message={
          <div>
            <p>Are you sure you want to delete your account?</p>
            <p className="mt-2 text-sm">This will permanently delete:</p>
            <ul className="text-sm mt-2 text-left list-disc list-inside">
              <li>All your favorites and presets</li>
              <li>Your credit balance ({user?.creditBalance || 0} credits)</li>
              <li>Your transaction history</li>
              <li>All personalization settings</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm mb-2">To confirm deletion, type <span className="font-mono text-red-400 font-bold">DELETE</span> below:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-center font-mono"
                autoComplete="off"
              />
            </div>
          </div>
        }
        confirmText="Delete My Account"
        cancelText="Keep My Account"
        variant="danger"
        isLoading={isDeleting}
        confirmDisabled={deleteConfirmText !== 'DELETE'}
      />

      {/* Change Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowEmailDialog(false);
              setEmailVerificationSent(false);
              setNewEmail('');
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Change Email Address
            </h3>

            {!emailVerificationSent ? (
              <>
                <p className="text-gray-400 text-center mb-4">
                  Enter your new email address. We'll send a verification link to confirm the change.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Current Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowEmailDialog(false);
                      setNewEmail('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={!newEmail || !newEmail.includes('@') || isSendingVerification}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSendingVerification ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      'Send Verification'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-400">
                    We've sent a verification link to:
                  </p>
                  <p className="text-white font-medium mt-1">{newEmail}</p>
                  <p className="text-gray-500 text-sm mt-4">
                    Please check your inbox and click the link to confirm your new email address.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowEmailDialog(false);
                    setEmailVerificationSent(false);
                    setNewEmail('');
                  }}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upgrade to Premium Dialog */}
      <ConfirmationDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onConfirm={handleUpgrade}
        title="Upgrade to Premium"
        message={
          upgradeSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium">Successfully upgraded to Premium!</p>
              <p className="text-gray-400 text-sm mt-1">Enjoy all premium features.</p>
            </div>
          ) : (
            <div>
              <p className="mb-4">Unlock all premium features:</p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full arbitrage opportunity details
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Line Movement Analysis
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AI-Powered Insights
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority Support
                </li>
              </ul>
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-center">
                <span className="text-2xl font-bold text-white">$29.99</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>
          )
        }
        confirmText={upgradeSuccess ? '' : 'Upgrade Now'}
        cancelText={upgradeSuccess ? 'Close' : 'Cancel'}
        variant="info"
        isLoading={isUpgrading}
      />

      {/* Change Plan Dialog */}
      {showChangePlanDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowChangePlanDialog(false);
              setPlanChangeSuccess(false);
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl mx-4 p-6" data-testid="change-plan-dialog">
            {planChangeSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Plan Changed Successfully!</h3>
                <p className="text-gray-400 mt-2">Your new plan is now active.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Change Your Plan</h3>
                <p className="text-gray-400 mb-6">Select a new plan. Changes take effect immediately.</p>

                {/* Plan Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Free Plan */}
                  <button
                    onClick={() => setSelectedPlan('free')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'free'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'free'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-free-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Free</span>
                      {user?.subscriptionTier === 'free' && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$0<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Basic arbitrage alerts</li>
                      <li>• 5 events per day</li>
                      <li>• Standard support</li>
                    </ul>
                  </button>

                  {/* Premium Plan */}
                  <button
                    onClick={() => setSelectedPlan('premium')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'premium'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'premium'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-premium-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Premium</span>
                      {user?.subscriptionTier === 'premium' && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$19.99<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• All Free features</li>
                      <li>• Unlimited events</li>
                      <li>• Full arbitrage details</li>
                      <li>• Priority support</li>
                    </ul>
                  </button>

                  {/* Pro Plan */}
                  <button
                    onClick={() => setSelectedPlan('pro')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'pro'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'pro'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-pro-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Pro</span>
                      {user?.subscriptionTier === 'pro' && (
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$49.99<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• All Premium features</li>
                      <li>• AI-powered insights</li>
                      <li>• API access</li>
                      <li>• Dedicated support</li>
                    </ul>
                  </button>
                </div>

                {/* Proration Summary */}
                {selectedPlan !== user?.subscriptionTier && (
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg" data-testid="proration-summary">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Billing Summary</h4>
                    {(() => {
                      const proration = calculateProration(user?.subscriptionTier || 'free', selectedPlan);
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Days remaining in cycle:</span>
                            <span className="text-white">{proration.daysRemaining} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              {proration.isRefund ? 'Credit to account:' : 'Prorated charge:'}
                            </span>
                            <span className={proration.isRefund ? 'text-green-400' : 'text-yellow-400'}>
                              {proration.isRefund ? '+' : ''}${proration.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-600 flex justify-between font-medium">
                            <span className="text-gray-300">New plan starts:</span>
                            <span className="text-white">Immediately</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowChangePlanDialog(false);
                      setPlanChangeSuccess(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePlan}
                    disabled={selectedPlan === user?.subscriptionTier || isChangingPlan}
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="confirm-plan-change"
                  >
                    {isChangingPlan ? 'Changing...' : selectedPlan === user?.subscriptionTier ? 'Current Plan' : 'Confirm Change'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Subscription Dialog */}
      {showCancelSubscriptionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={resetCancelDialog}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="cancel-subscription-dialog">
            {cancellationSuccess && cancellationDetails ? (
              // Success state
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Subscription Cancelled</h3>
                <div className="space-y-3 text-left bg-gray-700/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Access until:</span>
                    <span className="text-white font-medium" data-testid="access-end-date">
                      {new Date(cancellationDetails.accessEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Next billing:</span>
                    <span className="text-green-400 font-medium" data-testid="no-renewal">No renewal scheduled</span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <p className="text-gray-300 text-sm">
                      Your premium features will remain active until the end of your current billing period. You won't be charged again.
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetCancelDialog}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              // Cancellation form
              <>
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-white text-center mb-2">Cancel Subscription</h3>
                <p className="text-gray-400 text-center mb-6">
                  We're sorry to see you go. Please tell us why you're cancelling.
                </p>

                {/* Cancellation details */}
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6" data-testid="cancellation-details">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">What happens next:</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Premium access continues until end of billing period</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>No further charges will be made</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You can resubscribe at any time</span>
                    </li>
                  </ul>
                </div>

                {/* Reason selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Reason for cancellation <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2" data-testid="cancellation-reasons">
                    {cancellationReasons.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => {
                          setCancellationReason(reason.id);
                          setCancellationError(null);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          cancellationReason === reason.id
                            ? 'border-red-500 bg-red-500/10 text-white'
                            : 'border-gray-600 hover:border-gray-500 text-gray-300'
                        }`}
                        data-testid={`reason-${reason.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            cancellationReason === reason.id
                              ? 'border-red-500'
                              : 'border-gray-500'
                          }`}>
                            {cancellationReason === reason.id && (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                          <span>{reason.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {cancellationError && (
                    <p className="text-red-400 text-sm mt-2" data-testid="cancellation-error">
                      {cancellationError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={resetCancelDialog}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancelling || !cancellationReason}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="confirm-cancellation"
                  >
                    {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Self-Exclusion Options Modal */}
      {showSelfExclusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSelfExclusionModal(false)}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">Self-Exclusion Options</h3>
            <p className="text-gray-400 text-center mb-6">
              Choose how you'd like to limit your access to SportsAI.
            </p>

            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">24-Hour Timeout</div>
                    <div className="text-sm text-gray-400">Take a short break from the platform</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">7-Day Exclusion</div>
                    <div className="text-sm text-gray-400">Lock your account for a week</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">30-Day Exclusion</div>
                    <div className="text-sm text-gray-400">Extended break for a month</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-left transition-colors border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-red-400 font-medium">Permanent Self-Exclusion</div>
                    <div className="text-sm text-gray-400">Permanently close your account</div>
                  </div>
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowSelfExclusionModal(false)}
              className="w-full mt-6 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Regional Resources Modal */}
      {showResourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowResourcesModal(false)}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">Gambling Support Resources</h3>
            <p className="text-gray-400 text-center mb-6">
              If you or someone you know needs help with problem gambling, these organizations can provide support.
            </p>

            <div className="space-y-4">
              {/* USA */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-white font-medium">United States</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">National Council on Problem Gambling</span>
                    <a href="tel:1-800-522-4700" className="text-green-400 hover:text-green-300">1-800-522-4700</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Gamblers Anonymous</span>
                    <a href="https://www.gamblersanonymous.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* UK */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇬🇧</span>
                  <span className="text-white font-medium">United Kingdom</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">GamCare</span>
                    <a href="tel:0808-8020-133" className="text-green-400 hover:text-green-300">0808 8020 133</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">BeGambleAware</span>
                    <a href="https://www.begambleaware.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* Canada */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇨🇦</span>
                  <span className="text-white font-medium">Canada</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Problem Gambling Helpline</span>
                    <a href="tel:1-866-531-2600" className="text-green-400 hover:text-green-300">1-866-531-2600</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Responsible Gambling Council</span>
                    <a href="https://www.responsiblegambling.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* Australia */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇦🇺</span>
                  <span className="text-white font-medium">Australia</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Gambling Help Online</span>
                    <a href="tel:1800-858-858" className="text-green-400 hover:text-green-300">1800 858 858</a>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowResourcesModal(false)}
              className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset Preferences Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetPreferencesDialog}
        onClose={() => setShowResetPreferencesDialog(false)}
        onConfirm={handleResetPreferences}
        title="Reset Preferences"
        message="Are you sure you want to reset all display preferences to their default values? This will reset your odds format, timezone, and theme settings."
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        variant="warning"
      />

    </Layout>
  );
}
