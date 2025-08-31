import { isConnected, getPublicKey, signTransaction, requestAccess } from '@stellar/freighter-api';

export interface FreighterWallet {
  publicKey: string;
  isConnected: boolean;
}

export class FreighterService {
  static async checkConnection(): Promise<boolean> {
    try {
      return await isConnected();
    } catch (error) {
      console.error('Freighter connection check failed:', error);
      return false;
    }
  }

  static async connect(): Promise<FreighterWallet | null> {
    try {
      // First request access to the user's Freighter wallet
      await requestAccess();
      
      const connected = await isConnected();
      if (!connected) {
        throw new Error('Freighter wallet connection was denied or not available.');
      }

      const publicKey = await getPublicKey();
      
      return {
        publicKey,
        isConnected: true
      };
    } catch (error) {
      console.error('Failed to connect to Freighter:', error);
      return null;
    }
  }

  static async signTransaction(transactionXdr: string): Promise<string> {
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error('Freighter wallet not connected');
      }

      return await signTransaction(transactionXdr);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw new Error('Transaction signing failed');
    }
  }

  static async getPublicKey(): Promise<string | null> {
    try {
      const connected = await isConnected();
      if (!connected) return null;

      return await getPublicKey();
    } catch (error) {
      console.error('Failed to get public key:', error);
      return null;
    }
  }

  static isFreighterAvailable(): boolean {
    return typeof window !== 'undefined' && 'freighter' in window;
  }
}