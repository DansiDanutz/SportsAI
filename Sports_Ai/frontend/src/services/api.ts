import axios, { AxiosError, AxiosResponse } from 'axios';
import { cacheMetadataStore } from '../utils/cacheUtils';
import {
  idempotencyKeyStore,
  createRequestSignature,
  shouldUseIdempotencyKey,
} from '../utils/idempotencyUtils';
import { useDataFreshnessStore } from '../store/dataFreshnessStore';

// Prefer explicit env var, otherwise use same-origin /api.
// - Dev: Vite proxies /api -> http://localhost:4000 (see vite.config.ts)
// - Prod (Vercel): vercel.json rewrites /api -> Render backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Default timeout of 30 seconds to prevent indefinite hanging
const DEFAULT_TIMEOUT = 30000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
});

let refreshPromise: Promise<void> | null = null;

async function refreshSessionOnce(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/v1/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLoginPreservingNext(): void {
  const next = window.location.pathname + window.location.search;
  const url = `/login?next=${encodeURIComponent(next)}`;
  window.location.href = url;
}

// Request interceptor for idempotency keys and offline protection
api.interceptors.request.use(
  (config) => {
    // Track in-flight requests globally for "refreshing" UI
    try {
      useDataFreshnessStore.getState().requestStarted();
    } catch {
      // ignore
    }

    // Check if offline and reject write operations early
    if (!navigator.onLine) {
      const method = config.method?.toUpperCase() || 'GET';
      // For write operations when offline, reject immediately
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const offlineError = new Error('You are offline. This action requires an internet connection.');
        (offlineError as any).isOfflineError = true;
        return Promise.reject(offlineError);
      }
    }

    // Add idempotency key for POST requests to specific endpoints
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';

    if (shouldUseIdempotencyKey(method, url)) {
      // Create a signature for this request to track retries
      const signature = createRequestSignature(method, url, config.data);
      const idempotencyKey = idempotencyKeyStore.getOrCreate(signature);
      config.headers['Idempotency-Key'] = idempotencyKey;

      // Store signature in config for cleanup after successful response
      (config as any)._idempotencySignature = signature;
    }

    return config;
  },
  (error) => {
    try {
      useDataFreshnessStore.getState().requestFinished();
    } catch {
      // ignore
    }
    return Promise.reject(error);
  }
);

// Response interceptor to capture cache headers, handle errors, and cleanup idempotency keys
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Extract and store Cache-Control header for this endpoint
    const cacheControl = response.headers['cache-control'] || null;
    const endpoint = response.config.url || '';

    if (cacheControl) {
      // Store the cache metadata for later use by TanStack Query
      cacheMetadataStore.set(endpoint, cacheControl);
    }

    // Clear idempotency key after successful response
    const signature = (response.config as any)._idempotencySignature;
    if (signature) {
      idempotencyKeyStore.clear(signature);
    }

    // Track last successful API refresh (for "Updated X ago" in UI)
    try {
      const url = String(response.config?.url || '');
      if (url && !url.startsWith('/v1/auth/')) {
        useDataFreshnessStore.getState().markSuccess(url);
      }
    } catch {
      // ignore
    } finally {
      try {
        useDataFreshnessStore.getState().requestFinished();
      } catch {
        // ignore
      }
    }

    return response;
  },
  (error: AxiosError) => {
    try {
      useDataFreshnessStore.getState().requestFinished();
    } catch {
      // ignore
    }

    const status = error.response?.status;
    const originalRequest = error.config as any;
    const url = (originalRequest?.url as string | undefined) || '';

    // Handle authentication errors:
    // - First try a silent refresh (once) for non-auth endpoints
    // - If refresh fails, redirect to login preserving the intended destination
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint =
        url.includes('/v1/auth/login') ||
        url.includes('/v1/auth/signup') ||
        url.includes('/v1/auth/refresh') ||
        url.includes('/v1/auth/google/');

      const isMeEndpoint = url.includes('/v1/auth/me');
      const isPublicPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(window.location.pathname);

      // Don't redirect if we're on a public page and it's just the profile check failing
      if (isMeEndpoint && isPublicPage) {
        return Promise.reject(error);
      }

      if (!isAuthEndpoint) {
        originalRequest._retry = true;
        return refreshSessionOnce()
          .then(() => api(originalRequest))
          .catch(() => {
            // Clear any legacy token remnants (tokens should be cookies now)
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage');
            redirectToLoginPreservingNext();
            return Promise.reject(error);
          });
      }

      // Auth endpoint failed: redirect
      localStorage.removeItem('auth-storage');
      redirectToLoginPreservingNext();
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const timeoutError = new Error('Request timed out. Please check your connection and try again.');
      (timeoutError as any).isTimeout = true;
      (timeoutError as any).originalError = error;
      return Promise.reject(timeoutError);
    }

    // Handle network errors (no response)
    if (!error.response && error.message === 'Network Error') {
      const networkError = new Error('Unable to connect to the server. Please check your internet connection.');
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  }
);

// Auth types
export interface User {
  id: string;
  email: string;
  subscriptionTier: string;
  role: string;
  creditBalance: number;
  twoFactorEnabled?: boolean;
  phoneNumber?: string;
  websiteUrl?: string;
  profilePictureUrl?: string | null;
}

export interface AuthResponse {
  expiresIn?: number;
  user: User;
}

// Cookie/session-based auth response (no tokens in JS)
export interface AuthSessionResponse {
  expiresIn?: number;
  user: User;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: string;
  message: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  backupCodes?: string[];
}

// Device Session types
export interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// Auth API
export const authApi = {
  signup: async (email: string, password: string): Promise<AuthSessionResponse> => {
    const response = await api.post<AuthSessionResponse>('/v1/auth/signup', { email, password });
    return response.data;
  },

  login: async (
    email: string,
    password: string,
    options?: { rememberMe?: boolean },
  ): Promise<AuthSessionResponse | TwoFactorRequiredResponse> => {
    const response = await api.post<AuthSessionResponse | TwoFactorRequiredResponse>('/v1/auth/login', {
      email,
      password,
      rememberMe: options?.rememberMe === true,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/v1/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/v1/auth/me');
    return response.data;
  },

  // Two-Factor Authentication
  getTwoFactorStatus: async (): Promise<TwoFactorStatusResponse> => {
    const response = await api.get<TwoFactorStatusResponse>('/v1/auth/2fa/status');
    return response.data;
  },

  enableTwoFactor: async (): Promise<TwoFactorSetupResponse> => {
    const response = await api.post<TwoFactorSetupResponse>('/v1/auth/2fa/enable');
    return response.data;
  },

  verifyTwoFactor: async (token: string): Promise<TwoFactorVerifyResponse> => {
    const response = await api.post<TwoFactorVerifyResponse>('/v1/auth/2fa/verify', { token });
    return response.data;
  },

  disableTwoFactor: async (token: string): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>('/v1/auth/2fa/disable', { token });
    return response.data;
  },

  completeTwoFactorLogin: async (userId: string, token: string): Promise<AuthSessionResponse> => {
    const response = await api.post<AuthSessionResponse>('/v1/auth/2fa/complete-login', { userId, token });
    return response.data;
  },

  regenerateBackupCodes: async (token: string): Promise<{ backupCodes: string[] }> => {
    const response = await api.post<{ backupCodes: string[] }>('/v1/auth/2fa/regenerate-backup-codes', { token });
    return response.data;
  },

  // Device Session Management
  getSessions: async (): Promise<DeviceSession[]> => {
    const response = await api.get<DeviceSession[]>('/v1/auth/sessions');
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(`/v1/auth/sessions/${sessionId}/revoke`);
    return response.data;
  },

  revokeOtherSessions: async (refreshToken: string): Promise<{ success: boolean; revokedCount: number }> => {
    const response = await api.post<{ success: boolean; revokedCount: number }>('/v1/auth/sessions/revoke-others', { refreshToken });
    return response.data;
  },

  revokeAllSessions: async (): Promise<{ success: boolean; revokedCount: number }> => {
    const response = await api.post<{ success: boolean; revokedCount: number }>('/v1/auth/sessions/revoke-all');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/v1/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
};

// Event types
export interface Event {
  id: string;
  sport: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  homeTeamId: string | null;
  awayTeam: string;
  awayTeamId: string | null;
  startTime: string;
  status: string;
  venue: string | null;
  odds?: Array<{
    bookmaker?: string;
    market?: string;
    outcomeKey: string;
    odds: number;
    line?: number | null;
  }>;
}

export interface EventsResponse {
  events: Event[];
  total: number;
}

// Arbitrage types
export interface ArbitrageLeg {
  outcome: string;
  odds: number;
  bookmaker: string;
}

export interface ArbitrageOpportunity {
  id: string;
  sport: string;
  event: string;
  league: string;
  market: string;
  profit: number;
  confidence: number;
  timeLeft: string;
  legs: ArbitrageLeg[];
  isWinningTip?: boolean;
  creditCost?: number;
  isUnlocked?: boolean;
}

export interface ArbitrageResponse {
  tier: string;
  tierRestricted: boolean;
  opportunities?: ArbitrageOpportunity[];
  count?: number;
  total?: number;
  summary?: {
    totalOpportunities: number;
    bestROI: number;
    avgConfidence: number;
  };
  message?: string;
}

// AI types (used by Home/Daily AI screens)
export interface AiAdvice {
  id: string;
  category: 'opportunity' | 'warning' | 'strategy' | 'insight' | string;
  confidence: number;
  title: string;
  content: string;
  relatedMatch?: string | null;
  createdAt?: string;
}

export interface AiNewsItem {
  id: string;
  sport: string;
  impact: 'high' | 'medium' | 'low' | string;
  headline: string;
  summary: string;
  createdAt?: string;
}

export interface SharpMoneyAlert {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  alertType: 'steam_move' | 'reverse_line_movement' | 'sharp_action' | 'volume_spike' | string;
  severity: 'high' | 'medium' | 'low' | string;
  description: string;
  details: {
    previousOdds: number;
    currentOdds: number;
    oddsChange: number;
    percentageChange: number;
  };
  createdAt?: string;
}

// Arbitrage API
export const arbitrageApi = {
  getOpportunities: async (fullDetails: boolean = false): Promise<ArbitrageResponse> => {
    const response = await api.get<ArbitrageResponse>(`/v1/arbitrage/opportunities?fullDetails=${fullDetails}`);
    return response.data;
  },

  unlock: async (opportunityId: string): Promise<{ success: boolean; newBalance: number }> => {
    const response = await api.post('/v1/arbitrage/opportunities/' + opportunityId + '/unlock');
    return response.data;
  },
};

// Events API
export const eventsApi = {
  getAll: async (options?: {
    status?: string;
    sport?: string;
    favoritesOnly?: boolean;
    limit?: number;
  }): Promise<EventsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.sport) params.append('sport', options.sport);
    if (options?.favoritesOnly) params.append('favoritesOnly', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<EventsResponse>(`/v1/events?${params.toString()}`);
    return response.data;
  },

  getLive: async (options?: {
    favoritesOnly?: boolean;
    limit?: number;
  }): Promise<EventsResponse> => {
    const params = new URLSearchParams();
    if (options?.favoritesOnly) params.append('favoritesOnly', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<EventsResponse>(`/v1/events/live?${params.toString()}`);
    return response.data;
  },

  getUpcoming: async (options?: {
    favoritesOnly?: boolean;
    limit?: number;
  }): Promise<EventsResponse> => {
    const params = new URLSearchParams();
    if (options?.favoritesOnly) params.append('favoritesOnly', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<EventsResponse>(`/v1/events/upcoming?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<Event>(`/v1/events/${id}`);
    return response.data;
  },

  getSportsSummary: async (): Promise<Array<{ key: string; name: string; icon: string; events: number }>> => {
    const response = await api.get('/v1/events/summary/sports');
    return response.data;
  },

  getLeaguesSummary: async (): Promise<Array<{ id: string; name: string; sport: string; sportKey: string; country: string; events: number }>> => {
    const response = await api.get('/v1/events/summary/leagues');
    return response.data;
  },

  getStandings: async (eventId: string): Promise<StandingsResponse> => {
    const response = await api.get<StandingsResponse>(`/v1/events/${eventId}/standings`);
    return response.data;
  },
};

// Standings types
export interface StandingEntry {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

export interface StandingsResponse {
  leagueId: string;
  leagueName: string;
  season: string;
  updatedAt: string | null;
  standings: StandingEntry[];
}

// Favorites types
export interface Favorite {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
}

export interface FavoritesResponse {
  favorites: Favorite[];
  total: number;
}

// Favorites API
export const favoritesApi = {
  getAll: async (): Promise<FavoritesResponse> => {
    const response = await api.get<FavoritesResponse>('/v1/favorites');
    return response.data;
  },

  create: async (entityType: string, entityId: string): Promise<{ success: boolean; favorite: Favorite }> => {
    const response = await api.post('/v1/favorites', { entityType, entityId });
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/v1/favorites/${id}`);
    return response.data;
  },
};

// Subscription types
export interface SubscriptionCancellation {
  cancelledAt: string;
  reason: string;
  accessEndsAt: string;
  previousTier: string;
}

export interface SubscriptionResponse {
  tier: string;
  features: string[];
  cancellation: SubscriptionCancellation | null;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  cancellation?: SubscriptionCancellation;
}

// Subscription API
export const subscriptionApi = {
  get: async (): Promise<SubscriptionResponse> => {
    const response = await api.get<SubscriptionResponse>('/v1/users/me/subscription');
    return response.data;
  },

  cancel: async (reason: string): Promise<CancelSubscriptionResponse> => {
    const response = await api.post<CancelSubscriptionResponse>('/v1/users/me/subscription/cancel', { reason });
    return response.data;
  },

  upgrade: async (tier: string): Promise<{ success: boolean; message: string; user: User }> => {
    const response = await api.post<{ success: boolean; message: string; user: User }>('/v1/users/me/subscription/upgrade', { tier });
    return response.data;
  },
};

// Profile Picture API
export interface ProfilePictureResponse {
  success: boolean;
  message: string;
  profilePictureUrl?: string;
}

export const profileApi = {
  uploadPicture: async (file: File): Promise<ProfilePictureResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ProfilePictureResponse>('/v1/users/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deletePicture: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>('/v1/users/me/profile-picture');
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/v1/users/me');
    return response.data;
  },
};

// Language-related types and API
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface LanguagesResponse {
  languages: SupportedLanguage[];
  default: string;
}

export interface DetectedLanguage {
  detectedLanguage: SupportedLanguage;
  clientIp: string;
}

export const languageApi = {
  getSupportedLanguages: async (): Promise<LanguagesResponse> => {
    const response = await api.get<LanguagesResponse>('/v1/ai/languages');
    return response.data;
  },

  detectLanguage: async (): Promise<DetectedLanguage> => {
    const response = await api.get<DetectedLanguage>('/v1/ai/language/detect');
    return response.data;
  },
};

// Error helper utilities
export const isTimeoutError = (error: any): boolean => {
  return error?.isTimeout === true || error?.code === 'ECONNABORTED';
};

export const isNetworkError = (error: any): boolean => {
  return error?.isNetworkError === true || (!error?.response && error?.message === 'Network Error');
};

export const isOffline = (): boolean => {
  return !navigator.onLine;
};

export const isOfflineError = (error: any): boolean => {
  return error?.isOfflineError === true || (isNetworkError(error) && !navigator.onLine);
};

export const getErrorMessage = (error: any): string => {
  if (isOfflineError(error) || isOffline()) {
    return 'You are offline. This action requires an internet connection.';
  }
  if (isTimeoutError(error)) {
    return 'Request timed out. Please check your connection and try again.';
  }
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  // Server error with message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  // Generic error
  return error?.message || 'An unexpected error occurred. Please try again.';
};

// Export cache metadata store for use in TanStack Query hooks
export { cacheMetadataStore } from '../utils/cacheUtils';

// Apify Integration Types
export interface ApifyOddsResult {
  team1: string;
  team2: string;
  gameTime: string;
  league: string;
  moneyline?: {
    team1: number;
    team2: number;
    draw?: number;
  };
  spread?: {
    team1: number;
    team1Odds: number;
    team2: number;
    team2Odds: number;
  };
  total?: {
    over: number;
    overOdds: number;
    under: number;
    underOdds: number;
  };
  bookmaker: string;
  timestamp: string;
}

export interface ApifyPrediction {
  event: string;
  prediction: string;
  confidence: number;
  source: string;
  odds: number;
  timestamp: string;
}

export interface ApifyStatus {
  configured: boolean;
  apiToken: string;
  availableActors: string[];
}

export interface ApifyLeague {
  key: string;
  name: string;
  sport: string;
}

export interface ApifyBookmaker {
  key: string;
  name: string;
}

export interface ApifyLeaguesResponse {
  leagues: ApifyLeague[];
  bookmakers: ApifyBookmaker[];
}

export interface ApifyRunStatus {
  actorRunId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED';
  startedAt: string;
  finishedAt?: string;
  datasetId?: string;
}

export interface ApifyOddsResponse {
  success: boolean;
  league: string;
  count: number;
  data: ApifyOddsResult[];
  fetchedAt: string;
  source: 'apify' | 'unconfigured';
}

export interface ApifyPredictionsResponse {
  success: boolean;
  count: number;
  data: ApifyPrediction[];
  fetchedAt: string;
  source: 'apify' | 'unconfigured';
}

export interface ApifySyncResponse {
  success: boolean;
  message: string;
  league: string;
  fetched: number;
  created: number;
  updated: number;
  errors: number;
}

// Apify API
export const apifyApi = {
  getStatus: async (): Promise<ApifyStatus> => {
    const response = await api.get<ApifyStatus>('/v1/apify/status');
    return response.data;
  },

  getLeagues: async (): Promise<ApifyLeaguesResponse> => {
    const response = await api.get<ApifyLeaguesResponse>('/v1/apify/leagues');
    return response.data;
  },

  fetchOdds: async (options: {
    league: string;
    bookmakers?: string;
    date?: string;
  }): Promise<ApifyOddsResponse> => {
    const params = new URLSearchParams();
    params.append('league', options.league);
    if (options.bookmakers) params.append('bookmakers', options.bookmakers);
    if (options.date) params.append('date', options.date);

    const response = await api.get<ApifyOddsResponse>(`/v1/apify/odds?${params.toString()}`);
    return response.data;
  },

  fetchPredictions: async (): Promise<ApifyPredictionsResponse> => {
    const response = await api.get<ApifyPredictionsResponse>('/v1/apify/predictions');
    return response.data;
  },

  getRunHistory: async (): Promise<{ success: boolean; runs: ApifyRunStatus[] }> => {
    const response = await api.get<{ success: boolean; runs: ApifyRunStatus[] }>('/v1/apify/runs');
    return response.data;
  },

  syncOdds: async (league: string): Promise<ApifySyncResponse> => {
    const response = await api.post<ApifySyncResponse>('/v1/apify/sync/odds', { league });
    return response.data;
  },
};

// Chat API
export const chatApi = {
  sendMessage: async (message: string): Promise<{ response: string; suggestedActions: Array<{ label: string; action: string }> }> => {
    const response = await api.post('/v1/ai/chat', { message });
    return response.data;
  },
};
