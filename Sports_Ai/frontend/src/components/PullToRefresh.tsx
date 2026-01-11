import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = '',
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const maxPull = 120;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only start pull if we're at the top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 5) return;

      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || startY.current === null || disabled || isRefreshing) return;

      // Check if we're still at the top
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 5) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Pulling down - apply resistance
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);

        // Prevent default scroll behavior while pulling
        if (distance > 15) {
          e.preventDefault();
        }
      } else {
        // Pulling up, cancel
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) {
      isPulling.current = false;
      startY.current = null;
      return;
    }

    isPulling.current = false;
    startY.current = null;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Hold at refresh indicator height

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        // Small delay before hiding to show completion
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Didn't pull far enough, spring back
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center overflow-hidden pointer-events-none z-50"
        style={{
          top: -60,
          height: 60,
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.25s ease-out',
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 border border-gray-700 shadow-lg">
          {isRefreshing ? (
            // Spinning loader during refresh
            <svg
              className="w-6 h-6 text-green-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            // Arrow that rotates as user pulls
            <svg
              className="w-6 h-6 text-green-500 transition-transform duration-200"
              style={{
                transform: `rotate(${progress >= 1 ? 180 : progress * 180}deg)`,
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content that moves down during pull */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
