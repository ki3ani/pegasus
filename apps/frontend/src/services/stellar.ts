import * as StellarSdk from '@stellar/stellar-sdk';
import CryptoJS from 'crypto-js';

const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK || 'testnet';
const HORIZON_URL = STELLAR_NETWORK === 'mainnet' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Configure the network properly
const network = STELLAR_NETWORK === 'testnet' 
  ? StellarSdk.Networks.TESTNET 
  : StellarSdk.Networks.PUBLIC;

// Use the network variable if needed
console.log('Using network:', network);

export interface WalletInfo {
  publicKey: string;
  secretKey?: string;
}

export interface EncryptedWallet {
  encryptedData: string;
  publicKey: string;
}

export class StellarWalletService {
  private static ENCRYPTION_KEY = 'rebalancex-wallet-key-2024';

  static generateWallet(): WalletInfo {
    // Stellar SDK v14+ requires explicit random seed generation
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const buffer = Buffer.from(randomBytes);
    const keypair = StellarSdk.Keypair.fromRawEd25519Seed(buffer);
    
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret()
    };
  }

  static importWallet(secretKey: string): WalletInfo {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret()
      };
    } catch {
      throw new Error('Invalid secret key format');
    }
  }

  static encryptWallet(wallet: WalletInfo, userPassword: string): EncryptedWallet {
    const combinedKey = userPassword + this.ENCRYPTION_KEY;
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify({ secretKey: wallet.secretKey }),
      combinedKey
    ).toString();
    
    return {
      encryptedData,
      publicKey: wallet.publicKey
    };
  }

  static decryptWallet(encryptedWallet: EncryptedWallet, userPassword: string): WalletInfo {
    try {
      const combinedKey = userPassword + this.ENCRYPTION_KEY;
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedWallet.encryptedData, combinedKey);
      const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
      
      return {
        publicKey: encryptedWallet.publicKey,
        secretKey: decryptedData.secretKey
      };
    } catch {
      throw new Error('Failed to decrypt wallet - incorrect password');
    }
  }

  static async fundTestnetAccount(publicKey: string): Promise<boolean> {
    if (STELLAR_NETWORK !== 'testnet') {
      throw new Error('Account funding only available on testnet');
    }

    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      return response.ok;
    } catch (error) {
      console.error('Failed to fund testnet account:', error);
      return false;
    }
  }

  static async getAccountInfo(publicKey: string): Promise<StellarSdk.Horizon.AccountResponse | null> {
    try {
      return await server.loadAccount(publicKey);
    } catch (error) {
      if (error instanceof StellarSdk.NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  static async getAccountBalances(publicKey: string): Promise<Array<{ asset: string; balance: string }>> {
    try {
      const account = await this.getAccountInfo(publicKey);
      if (!account) return [];

      return account.balances.map(balance => {
        if (balance.asset_type === 'native') {
          return {
            asset: 'XLM',
            balance: balance.balance
          };
        } else if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
          return {
            asset: `${balance.asset_code}:${balance.asset_issuer}`,
            balance: balance.balance
          };
        } else {
          // Handle liquidity pool balances
          return {
            asset: 'LP Token',
            balance: balance.balance
          };
        }
      });
    } catch (error) {
      console.error('Failed to get account balances:', error);
      return [];
    }
  }

  static isValidPublicKey(publicKey: string): boolean {
    try {
      // In Stellar SDK v14+, use isValidEd25519PublicKey instead  
      return StellarSdk.StrKey.isValidEd25519PublicKey(publicKey);
    } catch {
      return false;
    }
  }

  static isValidSecretKey(secretKey: string): boolean {
    try {
      // In Stellar SDK v14+, use isValidEd25519SecretSeed instead
      return StellarSdk.StrKey.isValidEd25519SecretSeed(secretKey);
    } catch {
      return false;
    }
  }
}