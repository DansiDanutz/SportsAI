import { useEffect, useState } from 'react';
import { useToastStore, type Toast, type ToastType } from '../store/toastStore';

const iconMap: Record<ToastType, JSX.Element> = {
  success: (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const bgMap: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

function ToastItem({ toast: t }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => removeToast(t.id), 300);
  };

  // Start exit animation before auto-removal
  useEffect(() => {
    if (t.duration && t.duration > 0) {
      const exitTimer = setTimeout(() => setExiting(true), t.duration - 300);
      return () => clearTimeout(exitTimer);
    }
  }, [t.duration]);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl
        ${bgMap[t.type]}
        transition-all duration-300 ease-out
        ${exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{iconMap[t.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{t.title}</p>
        {t.message && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.message}</p>
        )}
      </div>
      {t.dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
