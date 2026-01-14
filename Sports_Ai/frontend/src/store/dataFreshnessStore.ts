import { create } from 'zustand';

interface DataFreshnessState {
  inFlight: number;
  lastSuccessfulAt: number | null;
  lastSuccessfulPath: string | null;
  requestStarted: () => void;
  requestFinished: () => void;
  markSuccess: (path?: string) => void;
}

export const useDataFreshnessStore = create<DataFreshnessState>((set) => ({
  inFlight: 0,
  lastSuccessfulAt: null,
  lastSuccessfulPath: null,
  requestStarted: () =>
    set((s) => ({
      inFlight: s.inFlight + 1,
    })),
  requestFinished: () =>
    set((s) => ({
      inFlight: Math.max(0, s.inFlight - 1),
    })),
  markSuccess: (path?: string) =>
    set(() => ({
      lastSuccessfulAt: Date.now(),
      lastSuccessfulPath: path || null,
    })),
}));

export function formatRelativeTime(ts: number | null): string {
  if (!ts) return '—';
  const diffMs = Date.now() - ts;
  const secs = Math.floor(diffMs / 1000);
  if (secs <= 0) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hour ago';
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

