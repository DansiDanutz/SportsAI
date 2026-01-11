import { useState } from 'react';
import { api } from '../services/api';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const SPORTS_OPTIONS = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'hockey', name: 'Hockey', icon: '🏒' },
  { key: 'baseball', name: 'Baseball', icon: '⚾' },
];

const BOOKMAKER_OPTIONS = [
  { key: 'bet365', name: 'Bet365' },
  { key: 'superbet', name: 'Superbet' },
  { key: 'betano', name: 'Betano' },
  { key: 'stake', name: 'Stake' },
  { key: 'unibet', name: 'Unibet' },
  { key: 'william_hill', name: 'William Hill' },
  { key: 'betfair', name: 'Betfair' },
  { key: '888sport', name: '888sport' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedBookmakers, setSelectedBookmakers] = useState<string[]>([]);
  const [oddsFormat, setOddsFormat] = useState<'decimal' | 'american' | 'fractional'>('decimal');
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;

  const handleSportToggle = (sportKey: string) => {
    setSelectedSports(prev =>
      prev.includes(sportKey)
        ? prev.filter(s => s !== sportKey)
        : [...prev, sportKey]
    );
  };

  const handleBookmakerToggle = (bookmakerKey: string) => {
    setSelectedBookmakers(prev =>
      prev.includes(bookmakerKey)
        ? prev.filter(b => b !== bookmakerKey)
        : [...prev, bookmakerKey]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Save preferences to backend
      await api.patch('/v1/users/me/preferences', {
        hasCompletedOnboarding: true,
        favoriteSports: selectedSports,
        favoriteBookmakers: selectedBookmakers,
        riskProfile,
        display: {
          oddsFormat,
          theme: 'dark',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
      // Still complete onboarding even if save fails
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await api.patch('/v1/users/me/preferences', {
        hasCompletedOnboarding: true,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
          <h2 className="text-2xl font-bold">Welcome to SportsAI! 🎉</h2>
          <p className="text-green-100 mt-1">Let's personalize your experience</p>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Which sports are you interested in?
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Select your favorite sports to see relevant arbitrage opportunities first.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SPORTS_OPTIONS.map(sport => (
                  <button
                    key={sport.key}
                    onClick={() => handleSportToggle(sport.key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedSports.includes(sport.key)
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <span className="text-2xl">{sport.icon}</span>
                    <span className="block mt-1 text-white font-medium">{sport.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Which bookmakers do you use?
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                We'll highlight opportunities from your preferred sportsbooks.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {BOOKMAKER_OPTIONS.map(bookmaker => (
                  <button
                    key={bookmaker.key}
                    onClick={() => handleBookmakerToggle(bookmaker.key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedBookmakers.includes(bookmaker.key)
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <span className="text-white font-medium">{bookmaker.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Choose your odds format
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                How would you like odds to be displayed?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setOddsFormat('decimal')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    oddsFormat === 'decimal'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <span className="text-white font-medium">Decimal</span>
                  <span className="text-gray-400 text-sm block">e.g., 2.50, 1.85</span>
                </button>
                <button
                  onClick={() => setOddsFormat('american')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    oddsFormat === 'american'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <span className="text-white font-medium">American</span>
                  <span className="text-gray-400 text-sm block">e.g., +150, -200</span>
                </button>
                <button
                  onClick={() => setOddsFormat('fractional')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    oddsFormat === 'fractional'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <span className="text-white font-medium">Fractional</span>
                  <span className="text-gray-400 text-sm block">e.g., 3/2, 5/1</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What is your risk profile?
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                This helps us rank arbitrage opportunities and AI tips.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setRiskProfile('conservative')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    riskProfile === 'conservative'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <span className="text-white font-medium block">Conservative</span>
                      <span className="text-gray-400 text-xs">High confidence, lower returns</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRiskProfile('balanced')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    riskProfile === 'balanced'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚖️</span>
                    <div>
                      <span className="text-white font-medium block">Balanced</span>
                      <span className="text-gray-400 text-xs">Equal focus on confidence and returns</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRiskProfile('aggressive')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    riskProfile === 'aggressive'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <span className="text-white font-medium block">Aggressive</span>
                      <span className="text-gray-400 text-xs">Higher returns, lower confidence threshold</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center justify-between">
          <div>
            {step === 1 ? (
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Skip for now
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
          <div>
            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Get Started"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
