/**
 * RebalanceX Reflector Oracle Client
 * Integrates with deployed Reflector oracle contract for portfolio rebalancing
 * Based on official Reflector contract examples and SEP-40 standard
 */

import * as StellarSdk from '@stellar/stellar-sdk'
import { prisma } from './db'

export interface PortfolioPosition {
  asset: {
    Stellar?: string,
    Other?: string
  }
  amount: string
}

export interface RebalanceRecommendation {
  asset: string
  action: 'buy' | 'sell' | 'hold'
  targetAmount: string
  currentAmount: string
  difference: string
  priority: number
}

export interface PriceOracleResponse {
  price: string
  timestamp: number
  decimals: number
}

/**
 * RebalanceX Oracle Client
 * Implements portfolio rebalancing logic using Reflector oracle data
 */
export class ReflectorOracleClient {
  private server: StellarSdk.rpc.Server
  private networkPassphrase: string
  private contractId: string
  private decimalPlaces: number = 14 // Reflector standard

  constructor(contractId?: string) {
    // Use testnet for development, mainnet for production
    const isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'
    
    this.server = new StellarSdk.rpc.Server(
      isTestnet 
        ? 'https://rpc-futurenet.stellar.org'
        : 'https://soroban.stellar.org:443'
    )
    
    this.networkPassphrase = isTestnet
      ? StellarSdk.Networks.FUTURENET
      : StellarSdk.Networks.PUBLIC

    // Use provided contract ID or fallback to our deployed contracts
    this.contractId = contractId || (process.env.STELLAR_NETWORK !== 'mainnet'
      ? 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP' // Testnet contract
      : 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M') // Mainnet contract

    console.log(`🔮 RebalanceX Oracle Client initialized`)
    console.log(`📡 Network: ${isTestnet ? 'testnet' : 'mainnet'}`)
    console.log(`🏷️  Contract: ${this.contractId}`)
  }

  /**
   * Get last price for an asset (SEP-40 standard)
   */
  async lastprice(asset: { Stellar?: string, Other?: string }): Promise<PriceOracleResponse | null> {
    try {
      console.log(`📊 Getting price for asset:`, asset)
      
      const assetScVal = StellarSdk.nativeToScVal(asset)
      const result = await this.executeContractCall('lastprice', [assetScVal])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(result)) {
        const priceData = StellarSdk.scValToNative(result.result!.retval)
        
        if (priceData && typeof priceData === 'object' && priceData.price) {
          return {
            price: this.formatPrice(BigInt(priceData.price)),
            timestamp: Number(priceData.timestamp) * 1000,
            decimals: this.decimalPlaces
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Oracle price fetch failed:', error)
      return null
    }
  }

  /**
   * Get oracle decimals (SEP-40 standard)
   */
  async decimals(): Promise<number> {
    try {
      const result = await this.executeContractCall('decimals', [])
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(result)) {
        const decimals = StellarSdk.scValToNative(result.result!.retval)
        this.decimalPlaces = Number(decimals)
        return this.decimalPlaces
      }
      
      return this.decimalPlaces
    } catch (error) {
      console.error('❌ Failed to get decimals:', error)
      return this.decimalPlaces
    }
  }

  /**
   * Portfolio Rebalancing Implementation
   * Based on official Reflector contract example (README.md lines 44-88)
   */
  async rebalancePortfolio(portfolio: PortfolioPosition[]): Promise<RebalanceRecommendation[]> {
    console.log(`🔄 Starting portfolio rebalancing for ${portfolio.length} positions`)
    
    try {
      // Storage for portfolio position values
      const values: number[] = []
      let totalValue = 0
      
      // Calculate total value of the portfolio
      for (let i = 0; i < portfolio.length; i++) {
        const position = portfolio[i]
        
        // Get price of the asset using Reflector oracle
        const priceData = await this.lastprice(position.asset)
        
        if (!priceData) {
          console.warn(`⚠️  No price data for asset:`, position.asset)
          values[i] = 0
          continue
        }
        
        // Calculate position USD value
        const assetValue = parseFloat(priceData.price) * parseFloat(position.amount)
        totalValue += assetValue
        values[i] = assetValue
        
        console.log(`💰 Position ${i}: $${assetValue.toFixed(2)}`)
      }
      
      console.log(`💼 Total portfolio value: $${totalValue.toFixed(2)}`)
      
      // Calculate average value per position (equal-weight rebalancing)
      const averagePositionValue = totalValue / portfolio.length
      console.log(`🎯 Target position value: $${averagePositionValue.toFixed(2)}`)
      
      // Generate rebalancing recommendations
      const recommendations: RebalanceRecommendation[] = []
      
      for (let i = 0; i < portfolio.length; i++) {
        const position = portfolio[i]
        const currentValue = values[i]
        const difference = currentValue - averagePositionValue
        const diffPercent = Math.abs(difference / averagePositionValue) * 100
        
        // Asset identifier for display
        const assetName = position.asset.Other || position.asset.Stellar || 'Unknown'
        
        let action: 'buy' | 'sell' | 'hold' = 'hold'
        let priority = 0
        
        // Rebalancing threshold (5% deviation triggers action)
        const threshold = averagePositionValue * 0.05
        
        if (difference > threshold) {
          // Position is overweight - sell some tokens
          action = 'sell'
          priority = Math.ceil(diffPercent / 5) // Higher deviation = higher priority
        } else if (difference < -threshold) {
          // Position is underweight - buy tokens
          action = 'buy'
          priority = Math.ceil(diffPercent / 5)
        }
        
        recommendations.push({
          asset: assetName,
          action,
          targetAmount: (averagePositionValue / (values[i] / parseFloat(position.amount))).toFixed(6),
          currentAmount: position.amount,
          difference: difference.toFixed(2),
          priority
        })
        
        console.log(`📈 ${assetName}: ${action.toUpperCase()} (${difference.toFixed(2)} USD, Priority: ${priority})`)
      }
      
      // Sort by priority (highest first)
      recommendations.sort((a, b) => b.priority - a.priority)
      
      console.log(`✅ Generated ${recommendations.length} rebalancing recommendations`)
      
      // Cache recommendations
      await this.cacheRebalanceData(recommendations)
      
      return recommendations
      
    } catch (error) {
      console.error('❌ Portfolio rebalancing failed:', error)
      throw error
    }
  }

  /**
   * Execute contract call on Stellar network
   */
  private async executeContractCall(
    method: string,
    args: StellarSdk.xdr.ScVal[]
  ): Promise<StellarSdk.rpc.Api.SimulateTransactionResponse> {
    const dummyKeypair = StellarSdk.Keypair.random()
    const dummyAccount = new StellarSdk.Account(dummyKeypair.publicKey(), '0')

    const contract = new StellarSdk.Contract(this.contractId)
    const operation = contract.call(method, ...args)

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(operation)
    .setTimeout(30)
    .build()

    return await this.server.simulateTransaction(transaction)
  }

  /**
   * Format price from i128 with decimals to human-readable string
   */
  private formatPrice(priceValue: bigint): string {
    const divisor = BigInt(Math.pow(10, this.decimalPlaces))
    const wholePart = priceValue / divisor
    const fractionalPart = priceValue % divisor
    
    if (fractionalPart === 0n) {
      return wholePart.toString()
    }
    
    const fractionalStr = fractionalPart.toString().padStart(this.decimalPlaces, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')
    
    return trimmedFractional.length > 0 
      ? `${wholePart}.${trimmedFractional}`
      : wholePart.toString()
  }

  /**
   * Cache rebalancing recommendations in database
   */
  private async cacheRebalanceData(recommendations: RebalanceRecommendation[]): Promise<void> {
    try {
      // Store rebalancing session
      await prisma.rebalanceSession.create({
        data: {
          recommendations: JSON.stringify(recommendations),
          timestamp: new Date(),
          source: 'reflector-oracle'
        }
      })
    } catch (error) {
      console.error('Failed to cache rebalance data:', error)
    }
  }

  /**
   * Asset helper - convert string to Reflector asset format
   */
  static createReflectorAsset(asset: string): { Stellar?: string, Other?: string } {
    // Stellar assets (by contract address)
    const stellarAssets: Record<string, string> = {
      'XLM': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      'USDC': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      'KALE': 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB'
    }

    if (stellarAssets[asset.toUpperCase()]) {
      return { Stellar: stellarAssets[asset.toUpperCase()] }
    } else {
      return { Other: asset.toUpperCase() }
    }
  }
}

// Export singleton instance for RebalanceX
export const reflectorOracleClient = new ReflectorOracleClient()