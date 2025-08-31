import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StellarWalletService } from '../services/stellar';
import { FreighterService } from '../services/freighter';
import type { WalletInfo, EncryptedWallet } from '../services/stellar';
import type { FreighterWallet } from '../services/freighter';

export type WalletType = 'generated' | 'imported' | 'freighter';

export interface WalletState {
  // Wallet info
  publicKey: string | null;
  walletType: WalletType | null;
  isConnected: boolean;
  encryptedWallet: EncryptedWallet | null;
  
  // Freighter specific
  freighterWallet: FreighterWallet | null;
  
  // Balance info
  balances: Array<{ asset: string; balance: string }>;
  isLoadingBalances: boolean;
  
  // Actions
  generateWallet: (password: string) => Promise<WalletInfo>;
  importWallet: (secretKey: string, password: string) => Promise<WalletInfo>;
  connectFreighter: () => Promise<FreighterWallet | null>;
  decryptWallet: (password: string) => Promise<WalletInfo | null>;
  loadBalances: () => Promise<void>;
  disconnect: () => void;
  
  // Getters
  hasWallet: () => boolean;
  isWalletDecrypted: () => boolean;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      walletType: null,
      isConnected: false,
      encryptedWallet: null,
      freighterWallet: null,
      balances: [],
      isLoadingBalances: false,

      generateWallet: async (password: string) => {
        const wallet = StellarWalletService.generateWallet();
        const encrypted = StellarWalletService.encryptWallet(wallet, password);
        
        // Fund testnet account
        if (import.meta.env.VITE_STELLAR_NETWORK === 'testnet') {
          await StellarWalletService.fundTestnetAccount(wallet.publicKey);
        }
        
        set({
          publicKey: wallet.publicKey,
          walletType: 'generated',
          isConnected: true,
          encryptedWallet: encrypted,
          freighterWallet: null
        });

        // Load initial balances
        get().loadBalances();
        
        return wallet;
      },

      importWallet: async (secretKey: string, password: string) => {
        const wallet = StellarWalletService.importWallet(secretKey);
        const encrypted = StellarWalletService.encryptWallet(wallet, password);
        
        set({
          publicKey: wallet.publicKey,
          walletType: 'imported',
          isConnected: true,
          encryptedWallet: encrypted,
          freighterWallet: null
        });

        // Load initial balances
        get().loadBalances();
        
        return wallet;
      },

      connectFreighter: async () => {
        const freighterWallet = await FreighterService.connect();
        
        if (freighterWallet) {
          set({
            publicKey: freighterWallet.publicKey,
            walletType: 'freighter',
            isConnected: true,
            encryptedWallet: null,
            freighterWallet
          });

          // Load initial balances
          get().loadBalances();
        }
        
        return freighterWallet;
      },

      decryptWallet: async (password: string) => {
        const { encryptedWallet } = get();
        if (!encryptedWallet) return null;

        try {
          const wallet = StellarWalletService.decryptWallet(encryptedWallet, password);
          return wallet;
        } catch (error) {
          console.error('Failed to decrypt wallet:', error);
          return null;
        }
      },

      loadBalances: async () => {
        const { publicKey } = get();
        if (!publicKey) return;

        set({ isLoadingBalances: true });
        
        try {
          const balances = await StellarWalletService.getAccountBalances(publicKey);
          set({ balances });
        } catch (error) {
          console.error('Failed to load balances:', error);
          set({ balances: [] });
        } finally {
          set({ isLoadingBalances: false });
        }
      },

      disconnect: () => {
        set({
          publicKey: null,
          walletType: null,
          isConnected: false,
          encryptedWallet: null,
          freighterWallet: null,
          balances: []
        });
      },

      hasWallet: () => {
        const state = get();
        return !!(state.encryptedWallet || state.freighterWallet);
      },

      isWalletDecrypted: () => {
        const { walletType, encryptedWallet, freighterWallet } = get();
        if (walletType === 'freighter') return !!freighterWallet;
        return !!encryptedWallet;
      }
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        publicKey: state.publicKey,
        walletType: state.walletType,
        isConnected: state.isConnected,
        encryptedWallet: state.encryptedWallet,
        // Note: freighterWallet is not persisted for security
      })
    }
  )
);