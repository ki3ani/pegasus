import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { connectFreighter } from '../utils/freighter';

// Types for Stellar API responses
interface StellarBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface StellarAccount {
  balances: StellarBalance[];
}

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  balance: string | null;
  assets: Array<{
    asset: string;
    balance: string;
  }>;
  isLoading: boolean;
  error: string | null;
}

interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Initial state
      publicKey: null,
      isConnected: false,
      balance: null,
      assets: [],
      isLoading: false,
      error: null,

      // Actions
      connect: async () => {
        console.log('WalletStore connect called')
        try {
          set({ isLoading: true, error: null });
          console.log('Calling connectFreighter...')

          const walletData = await connectFreighter();
          console.log('connectFreighter result:', walletData)

          if (walletData.publicKey) {
            console.log('Setting wallet data:', walletData.publicKey)
            
            set({
              publicKey: walletData.publicKey,
              isConnected: true,
              isLoading: false
            });

            // Fetch initial balance and assets
            console.log('Fetching initial balance...')
            await get().refreshBalance();
          } else {
            throw new Error('Failed to connect to Freighter');
          }
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
            isLoading: false
          });
        }
      },

      disconnect: () => {
        set({
          publicKey: null,
          isConnected: false,
          balance: null,
          assets: [],
          error: null
        });
      },

      refreshBalance: async () => {
        try {
          const { publicKey } = get();
          if (!publicKey) return;

          set({ isLoading: true, error: null });

          // Fetch account details from Stellar testnet
          const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Account not found on Stellar testnet. Please check your wallet connection.');
            }
            throw new Error(`Failed to fetch account data: ${response.status} ${response.statusText}`);
          }

          const accountData: StellarAccount = await response.json();

          if (accountData.balances) {
            // Get XLM balance
            const xlmBalance = accountData.balances.find((b: StellarBalance) => b.asset_type === 'native');
            const xlmAmount = xlmBalance ? xlmBalance.balance : '0';

            // Get other assets (excluding XLM)
            const otherAssets = accountData.balances
              .filter((b: StellarBalance) => b.asset_type !== 'native')
              .map((b: StellarBalance) => ({
                asset: `${b.asset_code}:${b.asset_issuer}`,
                balance: b.balance
              }));

            set({
              balance: xlmAmount,
              assets: otherAssets,
              isLoading: false
            });
          } else {
            // Account exists but has no balances
            set({
              balance: '0',
              assets: [],
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Failed to refresh balance:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh balance',
            isLoading: false
          });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error })
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        publicKey: state.publicKey,
        isConnected: state.isConnected
      })
    }
  )
);
