import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Supabase client for JWT verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export interface TokenPayload {
  userId: string;
  email: string;
  publicKey?: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new Error('Invalid token');
  }
};

export const verifySupabaseToken = async (token: string): Promise<TokenPayload> => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid Supabase token');
    }

    return {
      userId: user.id,
      email: user.email || ''
    };
  } catch {
    throw new Error('Invalid Supabase token');
  }
};

export const verifyAnyToken = async (token: string): Promise<TokenPayload> => {
  // Try Supabase token first
  if (supabase) {
    try {
      return await verifySupabaseToken(token);
    } catch {
      // If Supabase fails, try custom JWT
    }
  }
  
  // Fallback to custom JWT
  return verifyToken(token);
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};