import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to handle scroll position restoration when navigating back/forward.
 * Stores scroll positions in sessionStorage and restores them on back navigation.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);
  const isPopState = useRef(false);

  // Listen for popstate events (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save scroll position before leaving the page
  useEffect(() => {
    const saveScrollPosition = () => {
      if (previousPath.current) {
        const scrollPos = window.scrollY;
        sessionStorage.setItem(`scrollPos:${previousPath.current}`, String(scrollPos));
      }
    };

    // Save when navigating away
    return () => {
      saveScrollPosition();
    };
  }, [location.pathname]);

  // Restore or reset scroll position when location changes
  useEffect(() => {
    const key = `scrollPos:${location.pathname}${location.search}`;

    if (isPopState.current) {
      // Navigating back/forward - restore saved position
      const savedPosition = sessionStorage.getItem(key);
      if (savedPosition) {
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
        }, 0);
      }
      isPopState.current = false;
    } else {
      // Normal navigation - scroll to top
      window.scrollTo(0, 0);
    }

    previousPath.current = location.pathname + location.search;
  }, [location.pathname, location.search]);
}

/**
 * Hook for individual components that need to save/restore their scroll position.
 * Use this for scrollable containers that aren't the main window.
 *
 * @param key - Unique key for this scroll position
 * @returns ref to attach to the scrollable container
 */
export function useScrollPositionRestore(key: string) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Restore scroll position
    const savedPosition = sessionStorage.getItem(`containerScroll:${key}`);
    if (savedPosition) {
      element.scrollTop = parseInt(savedPosition, 10);
    }

    // Save scroll position on unmount
    return () => {
      if (element) {
        sessionStorage.setItem(`containerScroll:${key}`, String(element.scrollTop));
      }
    };
  }, [key, location.pathname]);

  return scrollRef;
}
