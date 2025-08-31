import * as freighterApi from '@stellar/freighter-api';

export interface FreighterWallet {
  publicKey: string;
  isConnected: boolean;
}

export class FreighterService {
  static async checkConnection(): Promise<boolean> {
    try {
      const result = await freighterApi.isConnected();
      return result.isConnected;
    } catch (error) {
      console.error('Freighter connection check failed:', error);
      return false;
    }
  }

  static async connect(): Promise<FreighterWallet | null> {
    try {
      // First request access to the user's Freighter wallet
      await freighterApi.requestAccess();
      
      const connectedResult = await freighterApi.isConnected();
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet connection was denied or not available.');
      }

      const addressResponse = await freighterApi.getAddress();
      
      return {
        publicKey: addressResponse.address,
        isConnected: true
      };
    } catch (error) {
      console.error('Failed to connect to Freighter:', error);
      return null;
    }
  }

  static async signTransaction(transactionXdr: string): Promise<string> {
    try {
      const connectedResult = await freighterApi.isConnected();
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet not connected');
      }

      const result = await freighterApi.signTransaction(transactionXdr);
      return result.signedTxXdr;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw new Error('Transaction signing failed');
    }
  }

  static async getPublicKey(): Promise<string | null> {
    try {
      const connectedResult = await freighterApi.isConnected();
      if (!connectedResult.isConnected) return null;

      const response = await freighterApi.getAddress();
      return response.address;
    } catch (error) {
      console.error('Failed to get public key:', error);
      return null;
    }
  }

  static isFreighterAvailable(): boolean {
    return typeof window !== 'undefined' && 'freighter' in window;
  }
}