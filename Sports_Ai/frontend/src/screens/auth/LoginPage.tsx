import { useState, useEffect, FormEvent, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Google sign-in failed. Please try again.',
  github_oauth_failed: 'GitHub sign-in failed. Please try again.',
  missing_params: 'Authentication callback was missing required parameters. Please try again.',
  oauth_cancelled: 'Sign-in was cancelled. Please try again.',
  session_expired: 'Your session expired. Please sign in again.',
};

function sanitizeNext(next: string | null): string | null {
  if (!next) return null;
  // Only allow internal relative paths
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState(false);
  const [githubOAuthConfigured, setGithubOAuthConfigured] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const {
    login,
    completeTwoFactorLogin,
    cancelTwoFactor,
    isLoading,
    error,
    clearError,
    requiresTwoFactor
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const twoFactorInputRef = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const nextParam = sanitizeNext(searchParams.get('next'));
  const stateFrom = (location.state as any)?.from?.pathname as string | undefined;
  const from = nextParam || stateFrom || '/home';

  // Check if Google OAuth is configured
  useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const response = await api.get('/v1/auth/google/status');
        setGoogleOAuthConfigured(response.data.configured);
      } catch {
        setGoogleOAuthConfigured(false);
      }
    };
    checkGoogleOAuth();

    const checkGitHubOAuth = async () => {
      try {
        const response = await api.get('/v1/auth/github/status');
        setGithubOAuthConfigured(response.data.configured);
      } catch {
        setGithubOAuthConfigured(false);
      }
    };
    checkGitHubOAuth();
  }, []);

  // Check for OAuth error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      // Only allow known error codes to prevent displaying attacker-controlled text
      const normalized = String(errorParam).trim().toLowerCase();
      const safeMessage = AUTH_ERROR_MESSAGES[normalized] || 'Authentication failed. Please try again.';
      useAuthStore.setState({ error: safeMessage });
    }
  }, [searchParams]);

  // Focus the 2FA input when the flow starts
  useEffect(() => {
    if (requiresTwoFactor) {
      setTimeout(() => twoFactorInputRef.current?.focus(), 0);
    }
  }, [requiresTwoFactor]);

  // Focus error alert when it appears
  useEffect(() => {
    if (error) {
      setTimeout(() => errorRef.current?.focus(), 0);
    }
  }, [error]);

  const handleGitHubLogin = async () => {
    setIsGitHubLoading(true);
    try {
      const response = await api.get('/v1/auth/github/url');
      window.location.href = response.data.authUrl;
    } catch {
      useAuthStore.setState({ error: 'Failed to initiate GitHub login' });
      setIsGitHubLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const response = await api.get('/v1/auth/google/url');
      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch {
      useAuthStore.setState({ error: 'Failed to initiate Google login' });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      const result = await login(email, password, { rememberMe });
      // If 2FA is not required, navigate
      if (!result.requiresTwoFactor) {
        navigate(from, { replace: true });
      }
      // If 2FA is required, the modal will be shown automatically
    } catch {
      // Error is handled in the store
    }
  };

  const handleTwoFactorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await completeTwoFactorLogin(twoFactorCode);
      navigate(from, { replace: true });
    } catch {
      // Error is handled in the store
    }
  };

  const handleCancelTwoFactor = () => {
    cancelTwoFactor();
    setTwoFactorCode('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">SportsAI</h1>
          <p className="text-gray-400 mt-2">Real-time arbitrage detection</p>
        </div>

        {/* 2FA Verification Form */}
        {requiresTwoFactor ? (
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2 text-center">Two-Factor Authentication</h2>
            <p className="text-gray-400 text-center text-sm mb-6">
              Enter the 6-digit code from your authenticator app or a backup code
            </p>

            {error && (
              <div
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
                role="alert"
                aria-live="polite"
                tabIndex={-1}
                ref={errorRef}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-300 mb-1">
                  Verification Code
                </label>
                <input
                  id="twoFactorCode"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
                    setTwoFactorCode(value);
                  }}
                  required
                  autoComplete="one-time-code"
                  ref={twoFactorInputRef}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="000000"
                  maxLength={8}
                  data-testid="2fa-login-input"
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Enter 6-digit code or 8-character backup code
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || (twoFactorCode.length !== 6 && twoFactorCode.length !== 8)}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center"
                data-testid="2fa-login-submit"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelTwoFactor}
                className="w-full py-2 px-4 text-gray-400 hover:text-white text-sm transition duration-200"
              >
                Cancel and try a different account
              </button>
            </form>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-6">Sign in</h2>

            {error && (
              <div
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
                role="alert"
                aria-live="polite"
                tabIndex={-1}
                ref={errorRef}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
                  />
                  <span className="ml-2 text-sm text-gray-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-green-500 hover:text-green-400">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* OAuth Login Options */}
            {(googleOAuthConfigured || githubOAuthConfigured) && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {googleOAuthConfigured && (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-3"
                      data-testid="google-login-button"
                    >
                      {isGoogleLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting to Google...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Login with Google
                        </>
                      )}
                    </button>
                  )}

                  {githubOAuthConfigured && (
                    <button
                      type="button"
                      onClick={handleGitHubLogin}
                      disabled={isGitHubLoading}
                      className="w-full py-3 px-4 bg-gray-900 hover:bg-black disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-3 border border-gray-600"
                      data-testid="github-login-button"
                    >
                      {isGitHubLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting to GitHub...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          Login with GitHub
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="mt-6 text-center">
              <span className="text-gray-400 text-sm">Don't have an account? </span>
              <Link to="/register" className="text-green-500 hover:text-green-400 text-sm font-medium">
                Sign up
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-gray-400">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-gray-400">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
