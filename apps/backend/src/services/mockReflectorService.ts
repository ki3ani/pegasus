/**
 * Mock Reflector Service for Development
 * Provides mock price data when the actual contract is not available
 */

export interface PriceData {
  price: bigint
  timestamp: number
}

export class MockReflectorService {
  private mockPrices: Map<string, PriceData> = new Map()

  constructor() {
    // Initialize with mock prices
    this.initializeMockPrices()
  }

  private initializeMockPrices() {
    const now = Math.floor(Date.now() / 1000)

    // Mock prices (scaled to 14 decimals as per contract)
    this.mockPrices.set('XLM', {
      price: BigInt(Math.floor(0.12 * Math.pow(10, 14))), // $0.12
      timestamp: now
    })

    this.mockPrices.set('USDC', {
      price: BigInt(Math.floor(1.0 * Math.pow(10, 14))), // $1.00
      timestamp: now
    })

    this.mockPrices.set('KALE', {
      price: BigInt(Math.floor(0.08 * Math.pow(10, 14))), // $0.08
      timestamp: now
    })

    console.log('🎭 Mock Reflector Service initialized with prices:')
    this.mockPrices.forEach((data, asset) => {
      console.log(`   ${asset}: $${Number(data.price) / Math.pow(10, 14)}`)
    })
  }

  /**
   * Get the last price for an asset
   */
  async getLastPrice(asset: { Stellar?: string; Other?: string }): Promise<PriceData | null> {
    try {
      let assetKey: string

      if (asset.Stellar) {
        // Map Stellar asset addresses to symbols
        if (asset.Stellar === 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC') {
          assetKey = 'XLM'
        } else if (asset.Stellar === 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5') {
          assetKey = 'USDC'
        } else if (asset.Stellar === 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB') {
          assetKey = 'KALE'
        } else {
          console.log(`⚠️  Unknown Stellar asset: ${asset.Stellar}`)
          return null
        }
      } else if (asset.Other) {
        assetKey = asset.Other
      } else {
        console.log('⚠️  Invalid asset format')
        return null
      }

      const priceData = this.mockPrices.get(assetKey)

      if (priceData) {
        console.log(`💰 Mock price for ${assetKey}: $${Number(priceData.price) / Math.pow(10, 14)}`)
        return priceData
      } else {
        console.log(`⚠️  No mock price available for ${assetKey}`)
        return null
      }

    } catch (error) {
      console.error('💥 Error getting mock price:', error)
      return null
    }
  }

  /**
   * Get decimals (always 14 for mock)
   */
  getDecimals(): number {
    return 14
  }

  /**
   * Update mock prices (for testing)
   */
  updatePrice(asset: string, price: number) {
    const priceBigInt = BigInt(Math.floor(price * Math.pow(10, 14)))
    this.mockPrices.set(asset, {
      price: priceBigInt,
      timestamp: Math.floor(Date.now() / 1000)
    })
    console.log(`🔄 Updated mock price for ${asset}: $${price}`)
  }

  /**
   * Get all available assets
   */
  getAvailableAssets(): string[] {
    return Array.from(this.mockPrices.keys())
  }
}

// Export singleton instance
export const mockReflectorService = new MockReflectorService()
