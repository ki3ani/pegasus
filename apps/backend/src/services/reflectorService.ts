/**
 * Reflector Oracle Service (Real Soroban Implementation)
 * Integrates with Reflector smart contracts on Stellar network
 * Based on official Reflector documentation and SEP-40 standard
 */

import * as StellarSdk from '@stellar/stellar-sdk'
import { prisma } from './db'
import { mockReflectorService } from './mockReflectorService'

// Reflector contract interface types based on documentation
export interface ReflectorAsset {
  Stellar?: string  // Stellar contract address
  Other?: string    // Symbol for external assets
}

export interface PriceData {
  price: bigint // i128 price value
  timestamp: bigint // u64 timestamp
}

export interface ReflectorPriceResponse {
  asset: string
  price: string
  timestamp: number
  source: 'reflector' | 'reflector-mainnet' | 'coingecko' | 'demo' | 'database'
  confidence?: number
}

export class ReflectorService {
  private server: StellarSdk.rpc.Server
  private networkPassphrase: string
  private stellarContractId: string
  private cexContractId: string
  private decimals: number = 14 // Reflector uses 14 decimals

  constructor() {
    // Initialize Stellar network configuration
    const isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'
    
    // Use more reliable RPC endpoints with explicit port and backup options
    // const rpcUrls = isTestnet 
    //   ? [
    //       'https://soroban-testnet.stellar.org:443',
    //       'https://rpc-futurenet.stellar.org',
    //       process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
    //     ]
    //   : [
    //       'https://soroban.stellar.org:443',
    //       process.env.SOROBAN_RPC_URL || 'https://soroban.stellar.org'
    //     ]

    // Use Futurenet for Reflector contracts as it's more stable for Soroban
    this.server = new StellarSdk.rpc.Server(
      isTestnet 
        ? 'https://rpc-futurenet.stellar.org'  // Futurenet for better Soroban support
        : 'https://soroban.stellar.org:443'
    )
    
    this.networkPassphrase = isTestnet
      ? StellarSdk.Networks.FUTURENET  // Use Futurenet for Soroban contracts
      : StellarSdk.Networks.PUBLIC

    // Reflector oracle contract addresses - Real deployed contracts
    this.stellarContractId = isTestnet
      ? process.env.REFLECTOR_TESTNET_CONTRACT || 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP'
      : process.env.REFLECTOR_MAINNET_CONTRACT || 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M'
    
    this.cexContractId = isTestnet
      ? process.env.REFLECTOR_TESTNET_CEX_CONTRACT || 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63'
      : process.env.REFLECTOR_MAINNET_CEX_CONTRACT || 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN'

    console.log(`🔮 Reflector Service initialized for ${isTestnet ? 'testnet' : 'mainnet'}`)
    console.log(`📡 Soroban RPC: ${this.server.serverURL}`)
    console.log(`🏷️  Stellar Contract: ${this.stellarContractId}`)
    console.log(`🏷️  CEX Contract: ${this.cexContractId}`)
  }

  /**
   * Get the appropriate contract ID for an asset based on Reflector docs
   */
  private getContractForAsset(asset: string): string {
    const stellarAssets = ['XLM', 'USDC', 'KALE'] // Assets on Stellar network
    
    // Use Stellar Pubnet oracle for XLM, USDC, KALE
    // Use External CEX & DEX oracle for BTC, ETH, etc.
    return stellarAssets.includes(asset.toUpperCase()) 
      ? this.stellarContractId  // CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP
      : this.cexContractId      // CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63
  }

  /**
   * Create Reflector asset parameter for contract calls
   * Based on official Reflector documentation - using proper Asset enum format
   */
  private createReflectorAsset(asset: string): ReflectorAsset {
    // Map assets based on the Reflector documentation examples
    const assetMapping: Record<string, ReflectorAsset> = {
      // Stellar assets use actual contract addresses from the docs
      'XLM': { 
        Stellar: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' // Correct XLM asset contract
      },
      'USDC': { 
        Stellar: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // Correct USDC on Stellar
      },
      'KALE': {
        Stellar: 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB' // Correct KALE token address
      },
      // External assets use Other enum with symbols  
      'BTC': { Other: 'BTC' },
      'ETH': { Other: 'ETH' }
    }

    return assetMapping[asset.toUpperCase()] || { Other: asset.toUpperCase() }
  }

  /**
   * Parse price data result from Soroban contract response
   */
  private parsePriceDataResult(scVal: StellarSdk.xdr.ScVal): PriceData | null {
    try {
      const result = StellarSdk.scValToNative(scVal)
      
      // Expected structure from Reflector: { price: i128, timestamp: u64 }
      if (result && typeof result === 'object' && result.price !== undefined) {
        return {
          price: BigInt(result.price),
          timestamp: BigInt(result.timestamp)
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to parse price data:', error)
      return null
    }
  }

  /**
   * Build and execute Soroban contract transaction
   */
  private async executeContractCall(
    method: string,
    args: StellarSdk.xdr.ScVal[],
    contractId?: string
  ): Promise<StellarSdk.rpc.Api.SimulateTransactionResponse> {
    try {
      // Create a dummy account for simulation (Soroban doesn't need real account for reads)
      const dummyKeypair = StellarSdk.Keypair.random()
      const dummyAccount = new StellarSdk.Account(dummyKeypair.publicKey(), '0')

      // Use provided contract ID or default to Stellar contract
      const targetContractId = contractId || this.stellarContractId
      const contract = new StellarSdk.Contract(targetContractId)
      const operation = contract.call(method, ...args)

      // Build transaction
      const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(operation)
      .setTimeout(30)
      .build()

      // Simulate transaction to get result
      const response = await this.server.simulateTransaction(transaction)
      
      if (StellarSdk.rpc.Api.isSimulationError(response)) {
        throw new Error(`Simulation failed: ${response.error}`)
      }

      return response
    } catch (error) {
      console.error(`Contract call ${method} failed:`, error)
      throw error
    }
  }

  /**
   * Get last price from Reflector oracle
   */
  async getLastPrice(asset: string): Promise<ReflectorPriceResponse | null> {
    const reflectorAsset = this.createReflectorAsset(asset)

    try {
      console.log(`🔍 Fetching last price for ${asset} from Reflector...`)

      // Convert asset to ScVal for contract call
      const assetScVal = StellarSdk.nativeToScVal(reflectorAsset)      // Choose contract based on asset type
      const contractId = this.getContractForAsset(asset)
      
      // Execute contract call - try different method names
      let response
      try {
        response = await this.executeContractCall('lastprice', [assetScVal], contractId)
      } catch {
        console.log(`❌ 'lastprice' failed, trying 'price' method...`)
        try {
          response = await this.executeContractCall('price', [assetScVal], contractId)
        } catch {
          console.log(`❌ 'price' failed, trying 'last_price' method...`)
          response = await this.executeContractCall('last_price', [assetScVal], contractId)
        }
      }
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        const priceData = this.parsePriceDataResult(response.result!.retval)
        
        if (priceData) {
          // Convert price from i128 with decimals to string
          const price = this.formatPrice(priceData.price)
          const timestamp = Number(priceData.timestamp) * 1000 // Convert to milliseconds
          
          const priceResponse: ReflectorPriceResponse = {
            asset: asset.toUpperCase(),
            price,
            timestamp,
            source: 'reflector'
          }

          // Cache in database
          await this.cachePriceData(asset, price, 'reflector')
          
          console.log(`✅ Got price for ${asset}: $${price}`)
          return priceResponse
        }
      }

      console.warn(`⚠️  No price data returned for ${asset}`)
      return null
    } catch (error) {
      console.error(`❌ Failed to get last price for ${asset}:`, error)

      // Try mock service as final fallback
      console.log(`🎭 Trying mock service for ${asset}...`)
      try {
        const mockPrice = await mockReflectorService.getLastPrice(reflectorAsset)
        if (mockPrice) {
          const price = this.formatPrice(mockPrice.price)
          const timestamp = mockPrice.timestamp * 1000 // Convert to milliseconds

          const priceResponse: ReflectorPriceResponse = {
            asset: asset.toUpperCase(),
            price,
            timestamp,
            source: 'demo'
          }

          console.log(`✅ Got mock price for ${asset}: $${price}`)
          return priceResponse
        }
      } catch (mockError) {
        console.error(`❌ Mock service also failed for ${asset}:`, mockError)
      }

      return null
    }
  }


  

  

  


  /**
   * Fallback: Get price from Stellar DEX orderbook
   */
  private async getFallbackPriceFromDEX(asset: string): Promise<ReflectorPriceResponse | null> {
    try {
      // Use stellarTradingService to get market price against USDC
      const { stellarTradingService } = await import('./stellarTradingService')
      
      if (asset === 'USDC') {
        return {
          asset: 'USDC',
          price: '1.0',
          timestamp: Date.now(),
          source: 'reflector'
        }
      }
      
      const marketPrice = await stellarTradingService.getMarketPrice(asset, 'USDC')
      if (marketPrice) {
        const priceResponse: ReflectorPriceResponse = {
          asset: asset.toUpperCase(),
          price: marketPrice,
          timestamp: Date.now(),
          source: 'reflector'
        }

        // Cache in database
        await this.cachePriceData(asset, marketPrice, 'stellar-dex-fallback')
        
        console.log(`✅ Got fallback price for ${asset}: $${marketPrice}`)
        return priceResponse
      }
      
      return null
    } catch (error) {
      console.error(`❌ Fallback price fetch failed for ${asset}:`, error)
      return null
    }
  }

  /**
   * Get Time-Weighted Average Price (TWAP)
   */
  async getTWAP(asset: string, records: number = 5): Promise<string | null> {
    try {
      console.log(`📊 Fetching TWAP for ${asset} (${records} records)...`)
      
      const reflectorAsset = this.createReflectorAsset(asset)
      const assetScVal = StellarSdk.nativeToScVal(reflectorAsset)
      const recordsScVal = StellarSdk.nativeToScVal(records, { type: 'u32' })
      
      const response = await this.executeContractCall('twap', [assetScVal, recordsScVal])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        const result = StellarSdk.scValToNative(response.result!.retval)
        
        if (result && typeof result === 'bigint') {
          const twapPrice = this.formatPrice(result)
          console.log(`✅ TWAP for ${asset}: $${twapPrice}`)
          return twapPrice
        }
      }

      return null
    } catch (error) {
      console.error(`❌ Failed to get TWAP for ${asset}:`, error)
      return null
    }
  }

  /**
   * Get cross price between two assets
   */
  async getCrossPrice(baseAsset: string, quoteAsset: string): Promise<ReflectorPriceResponse | null> {
    try {
      console.log(`🔄 Fetching cross price ${baseAsset}/${quoteAsset}...`)
      
      if (baseAsset === quoteAsset) {
        return {
          asset: `${baseAsset}/${quoteAsset}`,
          price: '1.0',
          timestamp: Date.now(),
          source: 'reflector'
        }
      }
      
      const baseReflectorAsset = this.createReflectorAsset(baseAsset)
      const quoteReflectorAsset = this.createReflectorAsset(quoteAsset)
      
      const baseAssetScVal = StellarSdk.nativeToScVal(baseReflectorAsset)
      const quoteAssetScVal = StellarSdk.nativeToScVal(quoteReflectorAsset)
      
      const response = await this.executeContractCall('cross_price', [baseAssetScVal, quoteAssetScVal])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        const priceData = this.parsePriceDataResult(response.result!.retval)
        
        if (priceData) {
          const crossPrice = this.formatPrice(priceData.price)
          const timestamp = Number(priceData.timestamp) * 1000
          
          console.log(`✅ Cross price ${baseAsset}/${quoteAsset}: ${crossPrice}`)
          return {
            asset: `${baseAsset}/${quoteAsset}`,
            price: crossPrice,
            timestamp,
            source: 'reflector'
          }
        }
      }

      return null
    } catch (error) {
      console.error(`❌ Failed to get cross price for ${baseAsset}/${quoteAsset}:`, error)
      return null
    }
  }

  /**
   * Get list of supported assets from Reflector
   */
  async getSupportedAssets(): Promise<string[]> {
    try {
      console.log('📋 Fetching supported assets from Reflector...')
      
      const response = await this.executeContractCall('assets', [])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        const result = StellarSdk.scValToNative(response.result!.retval)
        
        if (Array.isArray(result)) {
          const assets = result.map(asset => {
            if (typeof asset === 'object' && asset.value) {
              return asset.value
            }
            return asset.toString()
          })
          
          console.log(`✅ Found ${assets.length} supported assets:`, assets)
          return assets
        }
      }

      // Fallback to common assets if contract call fails
      console.warn('⚠️  Using fallback asset list')
      return ['XLM', 'USDC', 'KALE', 'BTC', 'ETH']
    } catch (error) {
      console.error('❌ Failed to get supported assets:', error)
      return ['XLM', 'USDC', 'KALE', 'BTC', 'ETH']
    }
  }

  /**
   * Get oracle decimals for price precision
   */
  async getDecimals(): Promise<number> {
    try {
      const response = await this.executeContractCall('decimals', [])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        const result = StellarSdk.scValToNative(response.result!.retval)
        
        if (typeof result === 'number') {
          this.decimals = result
          return result
        }
      }

      return this.decimals
    } catch (error) {
      console.error('❌ Failed to get oracle decimals:', error)
      return this.decimals
    }
  }

  /**
   * Format price from i128 with decimals to human-readable string
   */
  private formatPrice(priceValue: bigint): string {
    const divisor = BigInt(Math.pow(10, this.decimals))
    const wholePart = priceValue / divisor
    const fractionalPart = priceValue % divisor
    
    if (fractionalPart === 0n) {
      return wholePart.toString()
    }
    
    const fractionalStr = fractionalPart.toString().padStart(this.decimals, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')
    
    return trimmedFractional.length > 0 
      ? `${wholePart}.${trimmedFractional}`
      : wholePart.toString()
  }

  /**
   * Health check for Reflector oracle
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('🏥 Performing Reflector health check...')
      
      // Try to get decimals as a simple health check
      const decimals = await this.getDecimals()
      const isHealthy = decimals > 0
      
      console.log(`${isHealthy ? '✅' : '❌'} Reflector health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`)
      return isHealthy
    } catch (error) {
      console.error('❌ Reflector health check failed:', error)
      return false
    }
  }

  /**
   * Get prices for multiple assets with concurrent limiting
   */
  async getPrices(assets: string[]): Promise<ReflectorPriceResponse[]> {
    console.log(`🔍 Fetching prices for ${assets.length} assets:`, assets.join(', '))
    
    // Limit concurrent requests to avoid rate limiting
    const CONCURRENT_LIMIT = 3
    const results: ReflectorPriceResponse[] = []
    
    for (let i = 0; i < assets.length; i += CONCURRENT_LIMIT) {
      const batch = assets.slice(i, i + CONCURRENT_LIMIT)
      const batchPromises = batch.map(asset => this.getLastPrice(asset))
      
      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter((price): price is ReflectorPriceResponse => price !== null)
      
      results.push(...validResults)
      
      // Small delay between batches to be respectful
      if (i + CONCURRENT_LIMIT < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`✅ Successfully fetched ${results.length}/${assets.length} prices`)
    return results
  }

  /**
   * Cache price data in database
   */
  private async cachePriceData(asset: string, price: string, source: string): Promise<void> {
    try {
      await prisma.priceData.create({
        data: {
          asset: asset.toUpperCase(),
          priceUsd: price,
          source,
          timestamp: new Date(),
          confidence: 1.0 // Reflector data has high confidence
        }
      })
    } catch (error) {
      // Ignore duplicate errors but log others
      if (!(error instanceof Error) || !error.message?.includes('Unique constraint')) {
        console.error('Failed to cache price data:', error)
      }
    }
  }

  /**
   * Get latest prices from database fallback
   */
  async getLatestPricesFromDB(assets: string[]): Promise<Record<string, string>> {
    try {
      const cutoffTime = new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago

      const prices = await prisma.priceData.findMany({
        where: {
          asset: { in: assets.map(a => a.toUpperCase()) },
          timestamp: { gte: cutoffTime }
        },
        orderBy: { timestamp: 'desc' },
        distinct: ['asset']
      })

      const priceMap: Record<string, string> = {}
      prices.forEach(p => {
        priceMap[p.asset] = p.priceUsd
      })

      return priceMap
    } catch (error) {
      console.error('Failed to get prices from database:', error)
      return {}
    }
  }
}

// Singleton instance
export const reflectorService = new ReflectorService()