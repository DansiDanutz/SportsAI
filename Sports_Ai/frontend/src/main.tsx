import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Persist *real* query results so the app doesn't look empty after refresh/login.
// This is not mock data: it's the last successful API responses from this user's browser.
// Uses improved storage utilities with fallback and error handling
import { safeGetItem, safeSetItem, safeRemoveItem, monitorAndCleanupStorage } from './utils/storage';

// Monitor storage on app start
monitorAndCleanupStorage();

const storage: Storage = {
  getItem: (key) => {
    return safeGetItem(key, true); // Check fallback
  },
  setItem: (key, value) => {
    const result = safeSetItem(key, value, true); // Use fallback
    if (!result.success && result.error === 'quota_exceeded') {
      // Try cleanup and retry once
      if (monitorAndCleanupStorage()) {
        safeSetItem(key, value, true);
      }
    }
  },
  removeItem: (key) => {
    safeRemoveItem(key);
    // Also try to remove from sessionStorage fallback
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
  clear: () => {
    try {
      window.localStorage.clear();
    } catch {
      // Ignore
    }
  },
  key: (index) => {
    try {
      return window.localStorage.key(index);
    } catch {
      return null;
    }
  },
  get length() {
    try {
      return window.localStorage.length;
    } catch {
      return 0;
    }
  },
};

const persister = createSyncStoragePersister({
  storage,
  key: 'rq-cache',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: `sportsai-${import.meta.env.MODE}-v5`,
        maxAge: 1000 * 60 * 30, // keep 30 minutes of last-known real data
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const statusOk = query.state.status === 'success';
            const key0 = query.queryKey?.[0];
            // Avoid persisting auth/session-specific error states.
            if (!statusOk) return false;
            if (typeof key0 === 'string' && key0.startsWith('auth')) return false;
            return true;
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
    <Analytics />
  </React.StrictMode>
);
