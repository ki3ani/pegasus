import { describe, it, expect } from 'vitest';
import { StellarWalletService } from '../../services/stellar';

describe('StellarWalletService', () => {
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