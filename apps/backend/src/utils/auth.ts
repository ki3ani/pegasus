import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
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

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};