import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Field-level error interface
interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Validate email
  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return undefined;
  };

  // Validate password
  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required';
    const errors: string[] = [];
    if (value.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
    if (!/[0-9]/.test(value)) errors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('one special character');
    if (errors.length > 0) return `Password must contain ${errors.join(', ')}`;
    return undefined;
  };

  // Validate confirm password
  const validateConfirmPassword = (value: string, passwordValue: string): string | undefined => {
    if (!value) return 'Please confirm your password';
    if (value !== passwordValue) return 'Passwords do not match';
    return undefined;
  };

  // Validate all fields
  const validateAllFields = (): FieldErrors => {
    const errors: FieldErrors = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    const confirmError = validateConfirmPassword(confirmPassword, password);
    if (confirmError) errors.confirmPassword = confirmError;

    if (!termsAccepted) errors.terms = 'You must accept the terms and conditions';

    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setFormSubmitted(true);

    // Validate all fields at once
    const errors = validateAllFields();
    setFieldErrors(errors);

    // If there are any errors, don't submit
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await signup(email, password);
      navigate('/home', { replace: true });
    } catch {
      // Error is handled in the store
    }
  };

  // Real-time validation on blur/change after first submission
  const handleEmailBlur = () => {
    if (formSubmitted) {
      const emailError = validateEmail(email);
      setFieldErrors(prev => ({ ...prev, email: emailError }));
    }
  };

  const handlePasswordBlur = () => {
    if (formSubmitted) {
      const passwordError = validatePassword(password);
      setFieldErrors(prev => ({ ...prev, password: passwordError }));
      // Also re-validate confirm password
      if (confirmPassword) {
        const confirmError = validateConfirmPassword(confirmPassword, password);
        setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (formSubmitted) {
      const confirmError = validateConfirmPassword(confirmPassword, password);
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

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
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        {/* Register Form */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Sign up</h2>

          {error && (
            <div
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {hasErrors && formSubmitted && (
            <div
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
              role="alert"
              aria-live="polite"
              data-testid="validation-errors-summary"
            >
              <p className="text-red-400 text-sm font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                {fieldErrors.email && <li data-testid="error-email-summary">{fieldErrors.email}</li>}
                {fieldErrors.password && <li data-testid="error-password-summary">{fieldErrors.password}</li>}
                {fieldErrors.confirmPassword && <li data-testid="error-confirm-summary">{fieldErrors.confirmPassword}</li>}
                {fieldErrors.terms && <li data-testid="error-terms-summary">{fieldErrors.terms}</li>}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                autoComplete="email"
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-green-500 focus:border-transparent'
                }`}
                placeholder="you@example.com"
                data-testid="email-input"
              />
              {fieldErrors.email && (
                <p className="text-red-400 text-sm mt-1" data-testid="error-email">
                  {fieldErrors.email}
                </p>
              )}
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
                onBlur={handlePasswordBlur}
                autoComplete="new-password"
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                  fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-green-500 focus:border-transparent'
                }`}
                placeholder="Min 8 chars, uppercase, number, special"
                data-testid="password-input"
              />
              {fieldErrors.password && (
                <p className="text-red-400 text-sm mt-1" data-testid="error-password">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                autoComplete="new-password"
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                  fieldErrors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-green-500 focus:border-transparent'
                }`}
                placeholder="Confirm your password"
                data-testid="confirm-password-input"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1" data-testid="error-confirm-password">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className={`w-4 h-4 mt-1 rounded text-green-500 focus:ring-green-500 focus:ring-offset-gray-800 ${
                  fieldErrors.terms ? 'border-red-500' : 'border-gray-600'
                }`}
                data-testid="terms-checkbox"
              />
              <div className="ml-2">
                <label htmlFor="terms" className="text-sm text-gray-400">
                  I agree to the{' '}
                  <Link to="/terms" className="text-green-500 hover:text-green-400">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-green-500 hover:text-green-400">Privacy Policy</Link>
                </label>
                {fieldErrors.terms && (
                  <p className="text-red-400 text-sm mt-1" data-testid="error-terms">
                    {fieldErrors.terms}
                  </p>
                )}
              </div>
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-sm">Already have an account? </span>
            <Link to="/login" className="text-green-500 hover:text-green-400 text-sm font-medium">
              Sign in
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <div className="text-green-500 font-bold text-lg">10+</div>
            <div className="text-gray-400 text-xs">Sportsbooks</div>
          </div>
          <div className="p-3">
            <div className="text-green-500 font-bold text-lg">&lt;2s</div>
            <div className="text-gray-400 text-xs">Live Updates</div>
          </div>
          <div className="p-3">
            <div className="text-green-500 font-bold text-lg">AI</div>
            <div className="text-gray-400 text-xs">Insights</div>
          </div>
        </div>
      </div>
    </div>
  );
}
