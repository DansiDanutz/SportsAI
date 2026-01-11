import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // pixels to pull before triggering refresh
  maxPull?: number; // maximum pull distance
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  containerRef: React.RefObject<HTMLDivElement>;
  indicatorStyle: React.CSSProperties;
  showIndicator: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only start pull if we're at the top of the scroll container
      const scrollTop = container.scrollTop ?? 0;
      if (scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || startY.current === null || disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop ?? 0;
      if (scrollTop > 0) {
        // User started scrolling, cancel pull
        isPulling.current = false;
        setPullDistance(0);
        setShowIndicator(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Pulling down - apply resistance
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);
        setShowIndicator(true);

        // Prevent default scroll behavior while pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;

    isPulling.current = false;
    startY.current = null;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Snap to threshold height

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setShowIndicator(false);
      }
    } else {
      // Didn't pull far enough, spring back
      setPullDistance(0);
      setShowIndicator(false);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options: AddEventListenerOptions = { passive: false };

    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const indicatorStyle: React.CSSProperties = {
    transform: `translateY(${pullDistance}px)`,
    transition: isPulling.current ? 'none' : 'transform 0.2s ease-out',
  };

  return {
    isRefreshing,
    pullDistance,
    containerRef,
    indicatorStyle,
    showIndicator,
  };
}
