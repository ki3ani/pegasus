import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  // First try to get Supabase session token
  try {
    const { supabase } = await import('../../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseToken = session?.access_token;
    
    if (supabaseToken) {
      config.headers.Authorization = `Bearer ${supabaseToken}`;
      return config;
    }
  } catch {
    // Supabase not available, fall back to localStorage
  }
  
  // Fallback to localStorage token
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface SignupData {
  email: string;
  password: string;
  publicKey?: string;
  encryptedWalletData?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  publicKey?: string;
  encryptedWalletData?: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateWallet: async (publicKey: string, encryptedWalletData?: string): Promise<{ user: User }> => {
    const response = await api.put('/auth/wallet', {
      publicKey,
      encryptedWalletData,
    });
    return response.data;
  },

  healthCheck: async (): Promise<{ status: string; message: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  }
};

export { api };