import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWalletStore } from '../../store/walletStore'

// Mock the Freighter utilities
vi.mock('../../utils/freighter', () => ({
  connectFreighter: vi.fn()
}))

// Import the mocked function
import { connectFreighter } from '../../utils/freighter'
const mockConnectFreighter = vi.mocked(connectFreighter)

describe('Wallet Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the store state
    useWalletStore.setState({
      publicKey: null,
      isConnected: false,
      balance: null,
      assets: [],
      isLoading: false,
      error: null
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useWalletStore.getState()
      
      expect(state.publicKey).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.balance).toBeNull()
      expect(state.assets).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('Connect Action', () => {
    it('should connect successfully and update state', async () => {
      const mockWalletData = {
        publicKey: 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC',
        isConnected: true,
        network: 'testnet'
      }

      mockConnectFreighter.mockResolvedValue(mockWalletData)

      // Mock fetch for balance API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          balances: [
            { asset_type: 'native', balance: '100.0000000' }
          ]
        })
      })

      const { connect } = useWalletStore.getState()
      await connect()

      const state = useWalletStore.getState()
      expect(state.publicKey).toBe(mockWalletData.publicKey)
      expect(state.isConnected).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle connection error', async () => {
      const errorMessage = 'User denied connection'
      mockConnectFreighter.mockRejectedValue(new Error(errorMessage))

      const { connect } = useWalletStore.getState()
      await connect()

      const state = useWalletStore.getState()
      expect(state.publicKey).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('Disconnect Action', () => {
    it('should reset state when disconnecting', () => {
      // Set some connected state first
      useWalletStore.setState({
        publicKey: 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC',
        isConnected: true,
        balance: '100.0000000',
        assets: [{ asset: 'USDC', balance: '50.0000000' }]
      })

      const { disconnect } = useWalletStore.getState()
      disconnect()

      const state = useWalletStore.getState()
      expect(state.publicKey).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.balance).toBeNull()
      expect(state.assets).toEqual([])
    })
  })

  describe('Utility Actions', () => {
    it('should set and clear error messages', () => {
      const { setError } = useWalletStore.getState()
      
      setError('Test error message')
      expect(useWalletStore.getState().error).toBe('Test error message')
      
      setError(null)
      expect(useWalletStore.getState().error).toBeNull()
    })

    it('should set loading state', () => {
      const { setLoading } = useWalletStore.getState()
      
      setLoading(true)
      expect(useWalletStore.getState().isLoading).toBe(true)
      
      setLoading(false)
      expect(useWalletStore.getState().isLoading).toBe(false)
    })
  })
})