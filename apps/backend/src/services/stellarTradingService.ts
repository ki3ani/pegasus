/**
 * Stellar DEX Trading Service
 * Handles transaction building and execution for portfolio rebalancing
 * Integrates with Stellar Classic DEX for asset swaps
 */

import * as StellarSdk from '@stellar/stellar-sdk'
import { prisma } from './db'

export interface TradeInstruction {
  fromAsset: string
  toAsset: string
  fromAmount: string
  expectedToAmount: string
  maxSlippage: number
  priority: number
}

export interface StellarAssetInfo {
  code: string
  issuer?: string
  asset: StellarSdk.Asset
}

export interface TradeTransaction {
  id: string
  xdr: string
  trades: TradeInstruction[]
  estimatedFee: string
  expiresAt: Date
  userPublicKey: string
}

export interface TradeResult {
  success: boolean
  transactionId?: string
  error?: string
  actualSlippage?: number
  executedAmount?: string
}

export class StellarTradingService {
  private server: StellarSdk.Horizon.Server
  private networkPassphrase: string
  private isTestnet: boolean

  constructor() {
    this.isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'
    
    this.server = new StellarSdk.Horizon.Server(
      this.isTestnet 
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    )
    
    this.networkPassphrase = this.isTestnet
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC

    console.log(`💰 Stellar Trading Service initialized for ${this.isTestnet ? 'testnet' : 'mainnet'}`)
  }

  /**
   * Get Stellar asset object from asset code
   */
  private getStellarAsset(assetCode: string): StellarAssetInfo {
    const assetMap: Record<string, StellarAssetInfo> = {
      'XLM': {
        code: 'XLM',
        asset: StellarSdk.Asset.native()
      },
      'USDC': {
        code: 'USDC',
        issuer: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', // Circle USDC on Stellar
        asset: new StellarSdk.Asset('USDC', 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA')
      },
      'KALE': {
        code: 'KALE',
        issuer: 'CAJ42DGUSMWZP6JUFKPCRFQ7VQTTG6J7WCZPV7XXRKTFWK46CFBOJNXY', // KALE token
        asset: new StellarSdk.Asset('KALE', 'CAJ42DGUSMWZP6JUFKPCRFQ7VQTTG6J7WCZPV7XXRKTFWK46CFBOJNXY')
      }
    }

    const assetInfo = assetMap[assetCode.toUpperCase()]
    if (!assetInfo) {
      throw new Error(`Unsupported asset: ${assetCode}`)
    }

    return assetInfo
  }

  /**
   * Get current market price for asset pair from Stellar DEX
   */
  async getMarketPrice(sellAsset: string, buyAsset: string): Promise<string | null> {
    try {
      const selling = this.getStellarAsset(sellAsset)
      const buying = this.getStellarAsset(buyAsset)

      const orderbook = await this.server.orderbook(selling.asset, buying.asset).call()
      
      if (orderbook.asks.length === 0) {
        console.warn(`No market depth for ${sellAsset}/${buyAsset}`)
        return null
      }

      // Get the best ask price (what we'd pay to buy)
      const bestPrice = orderbook.asks[0].price
      console.log(`📊 Market price ${sellAsset}/${buyAsset}: ${bestPrice}`)
      
      return bestPrice
    } catch (error) {
      console.error(`Failed to get market price for ${sellAsset}/${buyAsset}:`, error)
      return null
    }
  }

  /**
   * Build a swap transaction using Stellar DEX
   */
  async buildSwapTransaction(
    userPublicKey: string,
    trade: TradeInstruction
  ): Promise<TradeTransaction> {
    try {
      console.log(`🔨 Building swap: ${trade.fromAmount} ${trade.fromAsset} → ${trade.toAsset}`)

      const account = await this.server.loadAccount(userPublicKey)
      const selling = this.getStellarAsset(trade.fromAsset)
      const buying = this.getStellarAsset(trade.toAsset)

      // Get current market price for slippage calculation
      const marketPrice = await this.getMarketPrice(trade.fromAsset, trade.toAsset)
      if (!marketPrice) {
        throw new Error(`No market available for ${trade.fromAsset}/${trade.toAsset}`)
      }

      // Calculate minimum amount to receive (accounting for slippage)
      // const expectedAmount = parseFloat(trade.expectedToAmount)
      // const slippageFactor = (100 - trade.maxSlippage) / 100
      // const minAmount = (expectedAmount * slippageFactor).toFixed(7)

      // Build the swap transaction using manageSellOffer
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: selling.asset,
        buying: buying.asset,
        amount: trade.fromAmount,
        price: marketPrice,
        offerId: '0' // 0 means create new offer
      }))
      .setTimeout(300) // 5 minutes timeout
      .build()

      const tradeTransaction: TradeTransaction = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        xdr: transaction.toXDR(),
        trades: [trade],
        estimatedFee: transaction.fee,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        userPublicKey
      }

      console.log(`✅ Built swap transaction: ${tradeTransaction.id}`)
      return tradeTransaction

    } catch (error) {
      console.error('Failed to build swap transaction:', error)
      throw new Error(`Failed to build swap: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build a batched rebalancing transaction with multiple swaps
   */
  async buildRebalanceTransaction(
    userPublicKey: string,
    trades: TradeInstruction[]
  ): Promise<TradeTransaction> {
    try {
      console.log(`🔨 Building rebalance transaction with ${trades.length} trades`)

      const account = await this.server.loadAccount(userPublicKey)
      const txBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })

      // Add each trade as a manageSellOffer operation
      for (const trade of trades) {
        const selling = this.getStellarAsset(trade.fromAsset)
        const buying = this.getStellarAsset(trade.toAsset)
        
        const marketPrice = await this.getMarketPrice(trade.fromAsset, trade.toAsset)
        if (!marketPrice) {
          throw new Error(`No market for ${trade.fromAsset}/${trade.toAsset}`)
        }

        txBuilder.addOperation(StellarSdk.Operation.manageSellOffer({
          selling: selling.asset,
          buying: buying.asset,
          amount: trade.fromAmount,
          price: marketPrice,
          offerId: '0'
        }))
      }

      const transaction = txBuilder.setTimeout(300).build()

      const rebalanceTransaction: TradeTransaction = {
        id: `rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        xdr: transaction.toXDR(),
        trades,
        estimatedFee: transaction.fee,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        userPublicKey
      }

      console.log(`✅ Built rebalance transaction: ${rebalanceTransaction.id}`)
      return rebalanceTransaction

    } catch (error) {
      console.error('Failed to build rebalance transaction:', error)
      throw new Error(`Failed to build rebalance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Submit a signed transaction to the Stellar network
   */
  async submitTransaction(signedXDR: string): Promise<TradeResult> {
    try {
      console.log('🚀 Submitting signed transaction to Stellar network...')

      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXDR, this.networkPassphrase)
      const result = await this.server.submitTransaction(transaction as StellarSdk.Transaction)

      if (result.successful) {
        console.log(`✅ Transaction successful: ${result.hash}`)
        return {
          success: true,
          transactionId: result.hash,
          actualSlippage: 0 // TODO: Calculate actual slippage from result
        }
      } else {
        console.error('❌ Transaction failed:', result)
        return {
          success: false,
          error: 'Transaction failed on Stellar network'
        }
      }

    } catch (error) {
      console.error('❌ Failed to submit transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown submission error'
      }
    }
  }

  /**
   * Check if user has sufficient balance for trades
   */
  async validateTradeBalances(
    userPublicKey: string,
    trades: TradeInstruction[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const account = await this.server.loadAccount(userPublicKey)
      const errors: string[] = []

      // Group trades by source asset to check total needed
      const assetRequirements: Record<string, number> = {}
      
      trades.forEach(trade => {
        const amount = parseFloat(trade.fromAmount)
        assetRequirements[trade.fromAsset] = (assetRequirements[trade.fromAsset] || 0) + amount
      })

      // Check each asset balance
      for (const [asset, requiredAmount] of Object.entries(assetRequirements)) {
        const balance = this.getAccountBalance(account, asset)
        
        if (balance < requiredAmount) {
          errors.push(`Insufficient ${asset}: need ${requiredAmount}, have ${balance}`)
        }
      }

      return {
        valid: errors.length === 0,
        errors
      }

    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate balances: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Get account balance for specific asset
   */
  private getAccountBalance(account: StellarSdk.Horizon.AccountResponse, assetCode: string): number {
    if (assetCode.toUpperCase() === 'XLM') {
      return parseFloat(account.balances.find((b) => b.asset_type === 'native')?.balance || '0')
    }

    const assetInfo = this.getStellarAsset(assetCode)
    const balance = account.balances.find((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
      b.asset_type !== 'native' && 
      b.asset_code === assetInfo.code &&
      b.asset_issuer === assetInfo.issuer
    )

    return parseFloat(balance?.balance || '0')
  }

  /**
   * Get optimal trade route (for future enhancement)
   */
  async getOptimalRoute(
    fromAsset: string,
    toAsset: string,
    amount: string
  ): Promise<TradeInstruction[]> {
    // For now, direct trading only
    // Future: implement path payments for better rates
    const marketPrice = await this.getMarketPrice(fromAsset, toAsset)
    
    if (!marketPrice) {
      throw new Error(`No direct market for ${fromAsset}/${toAsset}`)
    }

    const fromAmount = parseFloat(amount)
    const expectedToAmount = (fromAmount * parseFloat(marketPrice)).toFixed(7)

    return [{
      fromAsset,
      toAsset,
      fromAmount: amount,
      expectedToAmount,
      maxSlippage: 2.0, // 2% default slippage
      priority: 1
    }]
  }

  /**
   * Record trade execution in database
   */
  async recordTradeExecution(
    portfolioId: string,
    transaction: TradeTransaction,
    result: TradeResult
  ): Promise<void> {
    try {
      const tradePromises = transaction.trades.map(trade =>
        prisma.transaction.create({
          data: {
            portfolioId,
            type: 'rebalance',
            triggerReason: 'manual',
            fromAsset: trade.fromAsset,
            toAsset: trade.toAsset,
            fromAmount: trade.fromAmount,
            expectedAmount: trade.expectedToAmount,
            toAmount: result.executedAmount || '0',
            status: result.success ? 'completed' : 'failed',
            stellarTxId: result.transactionId,
            actualSlippage: result.actualSlippage || 0,
            gasFee: transaction.estimatedFee,
            errorMessage: result.error,
            completedAt: result.success ? new Date() : null
          }
        })
      )

      await Promise.all(tradePromises)
      console.log(`📝 Recorded ${transaction.trades.length} trade executions`)

    } catch (error) {
      console.error('Failed to record trade execution:', error)
    }
  }
}

// Singleton instance
export const stellarTradingService = new StellarTradingService()