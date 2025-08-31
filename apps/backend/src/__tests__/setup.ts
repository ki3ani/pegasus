import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rebalancex_user:secure_password_123@localhost:5433/rebalancex_test?schema=public';