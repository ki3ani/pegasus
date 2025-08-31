import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { StellarWalletService } from '../../services/stellar';
import * as StellarSdk from '@stellar/stellar-sdk';

vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    random: vi.fn(),
    fromSecret: vi.fn(),
  },
  StrKey: {
    isValidEd25519PublicKey: vi.fn(),
    isValidEd25519SecretSeed: vi.fn(),
  },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
  },
  Horizon: {
    Server: vi.fn(),
  },
  NotFoundError: class NotFoundError extends Error {},
}));

describe('StellarWalletService', () => {
  let callCount = 0;
  const keypairMap = new Map<string, { publicKey: string; secretKey: string }>();

  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    keypairMap.clear();

    // Mock Keypair.random to return different mock keypairs each time
    (StellarSdk.Keypair.random as Mock).mockImplementation(() => {
      callCount++;
      const mockPublicKey = `G${'A'.repeat(54)}${callCount}`;
      const mockSecretKey = `S${'A'.repeat(54)}${callCount}`;
      
      // Store the mapping for consistency
      keypairMap.set(mockSecretKey, { publicKey: mockPublicKey, secretKey: mockSecretKey });
      
      return {
        publicKey: vi.fn().mockReturnValue(mockPublicKey),
        secret: vi.fn().mockReturnValue(mockSecretKey),
      } as Partial<StellarSdk.Keypair>;
    });

    // Mock Keypair.fromSecret
    (StellarSdk.Keypair.fromSecret as Mock).mockImplementation((secret: string) => {
      if (!secret.startsWith('S') || secret.length !== 56) {
        throw new Error('Invalid secret key format');
      }
      
      // Check if we have this secret key in our map
      const existingKeypair = keypairMap.get(secret);
      if (existingKeypair) {
        return {
          publicKey: vi.fn().mockReturnValue(existingKeypair.publicKey),
          secret: vi.fn().mockReturnValue(secret),
        } as Partial<StellarSdk.Keypair>;
      }
      
      // If not found, create a new mapping (for testing purposes)
      const derivedPublicKey = `G${secret.slice(1)}`;
      keypairMap.set(secret, { publicKey: derivedPublicKey, secretKey: secret });
      
      return {
        publicKey: vi.fn().mockReturnValue(derivedPublicKey),
        secret: vi.fn().mockReturnValue(secret),
      } as Partial<StellarSdk.Keypair>;
    });

    // Mock StrKey validation methods
    (StellarSdk.StrKey.isValidEd25519PublicKey as Mock).mockImplementation((key: string) => {
      return key.startsWith('G') && key.length === 56;
    });

    (StellarSdk.StrKey.isValidEd25519SecretSeed as Mock).mockImplementation((key: string) => {
      return key.startsWith('S') && key.length === 56;
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('generateWallet', () => {
    it('should generate a valid Stellar wallet', () => {
      const wallet = StellarWalletService.generateWallet();
      
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.secretKey).toBeDefined();
      expect(wallet.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
      expect(wallet.secretKey).toMatch(/^S[A-Z0-9]{55}$/);
    });

    it('should generate unique wallets each time', () => {
      const wallet1 = StellarWalletService.generateWallet();
      const wallet2 = StellarWalletService.generateWallet();
      
      expect(wallet1.publicKey).not.toBe(wallet2.publicKey);
      expect(wallet1.secretKey).not.toBe(wallet2.secretKey);
    });
  });

  describe('importWallet', () => {
    it('should import a valid secret key', () => {
      const originalWallet = StellarWalletService.generateWallet();
      const importedWallet = StellarWalletService.importWallet(originalWallet.secretKey!);
      
      expect(importedWallet.publicKey).toBe(originalWallet.publicKey);
      expect(importedWallet.secretKey).toBe(originalWallet.secretKey);
    });

    it('should throw error for invalid secret key', () => {
      expect(() => {
        StellarWalletService.importWallet('invalid-secret-key');
      }).toThrow('Invalid secret key format');
    });
  });

  describe('encryptWallet and decryptWallet', () => {
    it('should encrypt and decrypt wallet correctly', () => {
      const wallet = StellarWalletService.generateWallet();
      const password = 'test-password-123';
      
      const encrypted = StellarWalletService.encryptWallet(wallet, password);
      expect(encrypted.publicKey).toBe(wallet.publicKey);
      expect(encrypted.encryptedData).toBeDefined();
      
      const decrypted = StellarWalletService.decryptWallet(encrypted, password);
      expect(decrypted.publicKey).toBe(wallet.publicKey);
      expect(decrypted.secretKey).toBe(wallet.secretKey);
    });

    it('should fail to decrypt with wrong password', () => {
      const wallet = StellarWalletService.generateWallet();
      const encrypted = StellarWalletService.encryptWallet(wallet, 'correct-password');
      
      expect(() => {
        StellarWalletService.decryptWallet(encrypted, 'wrong-password');
      }).toThrow('Failed to decrypt wallet - incorrect password');
    });
  });

  describe('validation functions', () => {
    it('should validate public keys correctly', () => {
      const wallet = StellarWalletService.generateWallet();
      
      expect(StellarWalletService.isValidPublicKey(wallet.publicKey)).toBe(true);
      expect(StellarWalletService.isValidPublicKey('invalid-key')).toBe(false);
      expect(StellarWalletService.isValidPublicKey('GABC123')).toBe(false);
    });

    it('should validate secret keys correctly', () => {
      const wallet = StellarWalletService.generateWallet();
      
      expect(StellarWalletService.isValidSecretKey(wallet.secretKey!)).toBe(true);
      expect(StellarWalletService.isValidSecretKey('invalid-key')).toBe(false);
      expect(StellarWalletService.isValidSecretKey('SABC123')).toBe(false);
    });
  });
});