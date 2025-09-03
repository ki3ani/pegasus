import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isFreighterAvailable, connectFreighter } from '../../utils/freighter'

// Mock the Freighter API
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn()
}))

// Import the mocked functions
import { isConnected, requestAccess, getNetwork } from '@stellar/freighter-api'

const mockIsConnected = vi.mocked(isConnected)
const mockRequestAccess = vi.mocked(requestAccess)
const mockGetNetwork = vi.mocked(getNetwork)

describe('Freighter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isFreighterAvailable', () => {
    it('should return true when Freighter API responds successfully', async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true })

      const result = await isFreighterAvailable()
      expect(result).toBe(true)
      expect(mockIsConnected).toHaveBeenCalledOnce()
    })

    it('should return false when Freighter API throws error', async () => {
      mockIsConnected.mockRejectedValue(new Error('Extension not found'))

      const result = await isFreighterAvailable()
      expect(result).toBe(false)
      expect(mockIsConnected).toHaveBeenCalledOnce()
    })
  })

  describe('connectFreighter', () => {
    it('should successfully connect and return wallet data', async () => {
      const mockPublicKey = 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC'
      const mockNetworkInfo = { 
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015'
      }

      mockRequestAccess.mockResolvedValue({ address: mockPublicKey })
      mockGetNetwork.mockResolvedValue(mockNetworkInfo)

      const result = await connectFreighter()

      expect(result).toEqual({
        publicKey: mockPublicKey,
        isConnected: true,
        network: 'testnet'
      })
      expect(mockRequestAccess).toHaveBeenCalledOnce()
      expect(mockGetNetwork).toHaveBeenCalledOnce()
    })

    it('should handle object response from requestAccess', async () => {
      const mockPublicKey = 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC'
      
      mockRequestAccess.mockResolvedValue({ address: mockPublicKey })
      mockGetNetwork.mockResolvedValue({ 
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015'
      })

      const result = await connectFreighter()

      expect(result).toEqual({
        publicKey: mockPublicKey,
        isConnected: true,
        network: 'testnet'
      })
    })

    it('should throw error when user denies connection', async () => {
      mockRequestAccess.mockRejectedValue(new Error('User denied access'))

      await expect(connectFreighter()).rejects.toThrow('Connection cancelled by user')
    })

    it('should throw error when requestAccess fails', async () => {
      mockRequestAccess.mockRejectedValue(new Error('User denied access'))

      await expect(connectFreighter()).rejects.toThrow('Connection cancelled by user')
    })

    it('should handle network API failure gracefully', async () => {
      const mockPublicKey = 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC'
      
      mockRequestAccess.mockResolvedValue({ address: mockPublicKey })
      mockGetNetwork.mockRejectedValue(new Error('Network API failed'))

      const result = await connectFreighter()

      expect(result).toEqual({
        publicKey: mockPublicKey,
        isConnected: true,
        network: 'testnet' // Should default to testnet
      })
    })

    it('should throw error when extension not available', async () => {
      mockRequestAccess.mockRejectedValue(new Error('Extension not available'))

      await expect(connectFreighter()).rejects.toThrow('Freighter extension not found')
    })
  })
})