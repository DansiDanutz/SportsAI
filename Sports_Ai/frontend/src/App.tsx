import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { GlobalFreshnessBadge } from './components/GlobalFreshnessBadge';
import { BetSlip } from './components/BetSlip';
import { api } from './services/api';

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import('./screens/landing').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./screens/auth').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./screens/auth').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./screens/auth').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./screens/auth').then(m => ({ default: m.ResetPasswordPage })));
const OAuthCallbackPage = lazy(() => import('./screens/auth').then(m => ({ default: m.OAuthCallbackPage })));
const HomePage = lazy(() => import('./screens/home').then(m => ({ default: m.HomePage })));
const ArbitragePage = lazy(() => import('./screens/arbitrage').then(m => ({ default: m.ArbitragePage })));
const ArbitrageDetailPage = lazy(() => import('./screens/arbitrage').then(m => ({ default: m.ArbitrageDetailPage })));
const SettingsPage = lazy(() => import('./screens/settings').then(m => ({ default: m.SettingsPage })));
const SportSettingsPage = lazy(() => import('./screens/settings').then(m => ({ default: m.SportSettingsPage })));
const FavoritesPage = lazy(() => import('./screens/favorites').then(m => ({ default: m.FavoritesPage })));
const CreditsPage = lazy(() => import('./screens/credits').then(m => ({ default: m.CreditsPage })));
const SportsPage = lazy(() => import('./screens/sports').then(m => ({ default: m.SportsPage })));
const SportEventsPage = lazy(() => import('./screens/sports').then(m => ({ default: m.SportEventsPage })));
const EventDetailPage = lazy(() => import('./screens/events').then(m => ({ default: m.EventDetailPage })));
const AdminPage = lazy(() => import('./screens/admin').then(m => ({ default: m.AdminPage })));
const ApifyPage = lazy(() => import('./screens/admin').then(m => ({ default: m.ApifyPage })));
const PresetsPage = lazy(() => import('./screens/presets').then(m => ({ default: m.PresetsPage })));
const LineMovementPage = lazy(() => import('./screens/line-movement').then(m => ({ default: m.LineMovementPage })));
const AiInsightsPage = lazy(() => import('./screens/ai-insights').then(m => ({ default: m.AiInsightsPage })));
const BookmakersPage = lazy(() => import('./screens/bookmakers').then(m => ({ default: m.BookmakersPage })));
const BookmakerDetailPage = lazy(() => import('./screens/bookmakers').then(m => ({ default: m.BookmakerDetailPage })));
const TeamDetailPage = lazy(() => import('./screens/teams').then(m => ({ default: m.TeamDetailPage })));
const NotFoundPage = lazy(() => import('./screens/not-found').then(m => ({ default: m.NotFoundPage })));
const TermsPage = lazy(() => import('./screens/legal').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./screens/legal').then(m => ({ default: m.PrivacyPage })));
const AlertsPage = lazy(() => import('./screens/alerts').then(m => ({ default: m.AlertsPage })));
const SetupPage = lazy(() => import('./screens/setup').then(m => ({ default: m.SetupPage })));
const DailyAiPage = lazy(() => import('./screens/daily-ai').then(m => ({ default: m.DailyAiPage })));
const ChatPage = lazy(() => import('./screens/chat').then(m => ({ default: m.ChatPage })));
const AccumulatorsPage = lazy(() => import('./screens/accumulators').then(m => ({ default: m.AccumulatorsPage })));
const StrategyPage = lazy(() => import('./screens/strategy').then(m => ({ default: m.StrategyPage })));
const WalletPage = lazy(() => import('./screens/wallet').then(m => ({ default: m.WalletPage })));
const PerformancePage = lazy(() => import('./screens/performance').then(m => ({ default: m.PerformancePage })));
const DemoPage = lazy(() => import('./screens/demo').then(m => ({ default: m.DemoPage })));
const PricingPage = lazy(() => import('./screens/pricing').then(m => ({ default: m.PricingPage })));
const LeaderboardPage = lazy(() => import('./screens/leaderboard').then(m => ({ default: m.LeaderboardPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  // Enable scroll position restoration for back/forward navigation
  useScrollRestoration();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check onboarding status from preferences
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        setHasCompletedOnboarding(null);
        return;
      }

      setIsCheckingOnboarding(true);
      try {
        // Don't block the entire app UI on this request. Also, cap the wait time
        // so the user never gets stuck on a full-screen spinner.
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const response = await api.get('/v1/users/me/preferences', { signal: controller.signal });
        window.clearTimeout(timeout);
        const prefs = response.data;
        setHasCompletedOnboarding(prefs.hasCompletedOnboarding === true);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // Default to completed if we can't check (don't block navigation)
        setHasCompletedOnboarding(true);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    if (isAuthenticated && user) {
      checkOnboardingStatus();
    }
  }, [isAuthenticated, user]);

  // Force setup if onboarding is not completed
  const needsSetup = isAuthenticated && user && hasCompletedOnboarding === false;
  const isAtSetup = location.pathname === '/setup';

  if (needsSetup && !isAtSetup) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900">
        {/* PWA Offline Banner */}
        <OfflineBanner />

        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />

        {/* Global update timestamp (public + private routes) */}
        <GlobalFreshnessBadge />

        {/* Floating Bet Slip */}
        {isAuthenticated && <BetSlip />}

        {/* Non-blocking onboarding check indicator */}
        {isCheckingOnboarding && isAuthenticated && user && (
          <div className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-gray-800/90 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500" />
            <span className="text-xs font-medium">Syncing profile…</span>
          </div>
        )}

        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <RegisterPage />
        } />
        <Route path="/forgot-password" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <ForgotPasswordPage />
        } />
        <Route path="/reset-password" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <ResetPasswordPage />
        } />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Protected Routes */}
        <Route path="/home" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/arbitrage" element={
          <ProtectedRoute>
            <ArbitragePage />
          </ProtectedRoute>
        } />
        <Route path="/arbitrage/:arbId" element={
          <ProtectedRoute>
            <ArbitrageDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/sports" element={
          <ProtectedRoute>
            <SportsPage />
          </ProtectedRoute>
        } />
        <Route path="/sports/:sportKey" element={
          <ProtectedRoute>
            <SportEventsPage />
          </ProtectedRoute>
        } />
        <Route path="/event/:eventId" element={
          <ProtectedRoute>
            <EventDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        } />
        <Route path="/credits" element={
          <ProtectedRoute>
            <CreditsPage />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        } />
        <Route path="/performance" element={
          <ProtectedRoute>
            <PerformancePage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/sports/:sportKey" element={
          <ProtectedRoute>
            <SportSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/presets" element={
          <ProtectedRoute>
            <PresetsPage />
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        } />
        <Route path="/setup" element={
          <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
        } />
        <Route path="/daily-ai" element={
          <ProtectedRoute>
            <DailyAiPage />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />
        <Route path="/accumulators" element={
          <ProtectedRoute>
            <AccumulatorsPage />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
        } />
        <Route path="/strategy" element={
          <ProtectedRoute>
            <StrategyPage />
          </ProtectedRoute>
        } />
        <Route path="/bookmakers" element={
          <ProtectedRoute>
            <BookmakersPage />
          </ProtectedRoute>
        } />
        <Route path="/bookmakers/:bookmakerId" element={
          <ProtectedRoute>
            <BookmakerDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/teams/:teamId" element={
          <ProtectedRoute>
            <TeamDetailPage />
          </ProtectedRoute>
        } />

        {/* Premium-only Routes */}
        <Route path="/line-movement" element={
          <ProtectedRoute requirePremium>
            <LineMovementPage />
          </ProtectedRoute>
        } />
        <Route path="/ai-insights" element={
          <ProtectedRoute requirePremium>
            <AiInsightsPage />
          </ProtectedRoute>
        } />

        {/* Admin-only Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/apify" element={
          <ProtectedRoute requireAdmin>
            <ApifyPage />
          </ProtectedRoute>
        } />

        {/* 404 Not Found */}
        <Route path="*" element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        } />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default App;
