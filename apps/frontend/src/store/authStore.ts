import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, User, SignupData, LoginData } from '../services/api/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateWallet: (publicKey: string, encryptedWalletData?: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.signup(data);
          
          localStorage.setItem('auth_token', response.token);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Signup failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login(data);
          
          localStorage.setItem('auth_token', response.token);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      loadUser: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.getMe();
          
          set({
            user: response.user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          localStorage.removeItem('auth_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired'
          });
        }
      },

      updateWallet: async (publicKey: string, encryptedWalletData?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.updateWallet(publicKey, encryptedWalletData);
          
          set({
            user: response.user,
            isLoading: false
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Failed to update wallet';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);