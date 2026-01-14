import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter } from 'react-router-dom';
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
const storage: Storage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore quota/unavailable storage errors (app will still work without persistence)
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  clear: () => window.localStorage.clear(),
  key: (index) => window.localStorage.key(index),
  length: window.localStorage.length,
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
  </React.StrictMode>
);
