import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { authApi, User, AuthSessionResponse, TwoFactorRequiredResponse } from '../services/api';
import { safeSetItem, safeGetItem, safeRemoveItem, StorageResult } from '../utils/storage';

// Custom storage adapter with error handling
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return safeGetItem(name);
  },
  setItem: (name: string, value: string): void => {
    const result: StorageResult = safeSetItem(name, value);
    if (!result.success && result.error === 'quota_exceeded') {
      console.error('Auth storage quota exceeded:', result.message);
      // The token is still in memory, so auth will work for this session
    }
  },
  removeItem: (name: string): void => {
    safeRemoveItem(name);
  },
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 2FA state
  requiresTwoFactor: boolean;
  pendingTwoFactorUserId: string | null;

  // Actions
  login: (email: string, password: string, options?: { rememberMe?: boolean }) => Promise<{ requiresTwoFactor: boolean }>;
  completeTwoFactorLogin: (token: string) => Promise<void>;
  cancelTwoFactor: () => void;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Type guard for 2FA response
function isTwoFactorRequired(response: AuthSessionResponse | TwoFactorRequiredResponse): response is TwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor === true;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      requiresTwoFactor: false,
      pendingTwoFactorUserId: null,

      login: async (email: string, password: string, options?: { rememberMe?: boolean }) => {
        set({ isLoading: true, error: null, requiresTwoFactor: false, pendingTwoFactorUserId: null });
        try {
          const response = await authApi.login(email, password, { rememberMe: options?.rememberMe === true });

          // Check if 2FA is required
          if (isTwoFactorRequired(response)) {
            set({
              requiresTwoFactor: true,
              pendingTwoFactorUserId: response.userId,
              isLoading: false,
            });
            return { requiresTwoFactor: true };
          }

          // Regular login without 2FA
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            requiresTwoFactor: false,
            pendingTwoFactorUserId: null,
          });
          return { requiresTwoFactor: false };
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      completeTwoFactorLogin: async (token: string) => {
        const userId = get().pendingTwoFactorUserId;
        if (!userId) {
          throw new Error('No pending 2FA login');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authApi.completeTwoFactorLogin(userId, token);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            requiresTwoFactor: false,
            pendingTwoFactorUserId: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Invalid verification code';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      cancelTwoFactor: () => {
        set({
          requiresTwoFactor: false,
          pendingTwoFactorUserId: null,
          error: null,
        });
      },

      signup: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: AuthSessionResponse = await authApi.signup(email, password);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Signup failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout
        } finally {
          // Clear any legacy token remnants
          safeRemoveItem('token');
          safeRemoveItem('refreshToken');
          safeRemoveItem('accessToken');
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.getProfile();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
