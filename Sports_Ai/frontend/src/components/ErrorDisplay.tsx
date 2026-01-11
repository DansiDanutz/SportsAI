import { isTimeoutError, isNetworkError, getErrorMessage } from '../services/api';

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className = '' }: ErrorDisplayProps) {
  const isTimeout = isTimeoutError(error);
  const isNetwork = isNetworkError(error);
  const message = getErrorMessage(error);

  // Choose icon based on error type
  const getIcon = () => {
    if (isTimeout) {
      // Clock icon for timeout
      return (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (isNetwork) {
      // Wifi off icon for network
      return (
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
      );
    }
    // Generic error icon
    return (
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  const getTitle = () => {
    if (isTimeout) return 'Request Timed Out';
    if (isNetwork) return 'Connection Error';
    return 'Something Went Wrong';
  };

  const getColorScheme = () => {
    if (isTimeout) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-red-500/50 bg-red-500/10';
  };

  return (
    <div className={`rounded-xl border p-6 text-center ${getColorScheme()} ${className}`}>
      <div className="flex justify-center mb-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isTimeout ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          {getIcon()}
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{getTitle()}</h3>
      <p className="text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}

// Inline error message component for forms
interface InlineErrorProps {
  error: any;
  className?: string;
}

export function InlineError({ error, className = '' }: InlineErrorProps) {
  const message = getErrorMessage(error);

  return (
    <div className={`flex items-center gap-2 text-red-400 text-sm ${className}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
