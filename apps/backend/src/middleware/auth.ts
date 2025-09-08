import express from 'express';
import { verifyAnyToken } from '../utils/auth.js';
import type { TokenPayload } from '../utils/auth.js';

export interface AuthRequest extends express.Request {
  user?: TokenPayload;
}

export const authenticateToken = async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = await verifyAnyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};