import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { GlobalFreshnessBadge } from './components/GlobalFreshnessBadge';
import { api } from './services/api';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, OAuthCallbackPage } from './screens/auth';
import { HomePage } from './screens/home';
import { ArbitragePage, ArbitrageDetailPage } from './screens/arbitrage';
import { SettingsPage, SportSettingsPage } from './screens/settings';
import { FavoritesPage } from './screens/favorites';
import { CreditsPage } from './screens/credits';
import { SportsPage, SportEventsPage } from './screens/sports';
import { EventDetailPage } from './screens/events';
import { AdminPage, ApifyPage } from './screens/admin';
import { PresetsPage } from './screens/presets';
import { LineMovementPage } from './screens/line-movement';
import { AiInsightsPage } from './screens/ai-insights';
import { BookmakersPage, BookmakerDetailPage } from './screens/bookmakers';
import { TeamDetailPage } from './screens/teams';
import { NotFoundPage } from './screens/not-found';
import { TermsPage, PrivacyPage } from './screens/legal';
import { AlertsPage } from './screens/alerts';
import { SetupPage } from './screens/setup';
import { DailyAiPage } from './screens/daily-ai';
import { ChatPage } from './screens/chat';

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
    <div className="min-h-screen bg-gray-900">
      {/* PWA Offline Banner */}
      <OfflineBanner />

      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />

      {/* Global update timestamp (public + private routes) */}
      <GlobalFreshnessBadge />

      {/* Non-blocking onboarding check indicator */}
      {isCheckingOnboarding && isAuthenticated && user && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-gray-800/90 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500" />
          <span className="text-xs font-medium">Syncing profile…</span>
        </div>
      )}

      <Routes>
        {/* Public Routes */}
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

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* 404 Not Found */}
        <Route path="*" element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;
