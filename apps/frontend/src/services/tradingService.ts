import { apiClient } from './api'

export interface TradeInstruction {
  fromAsset: string
  toAsset: string
  fromAmount: string
  expectedToAmount: string
  maxSlippage: number
  priority: number
}

export interface TradeTransaction {
  id: string
  xdr: string
  estimatedFee: string
  expiresAt: string
  trade?: TradeInstruction
  tradesCount?: number
  trades?: TradeInstruction[]
}

export interface TradeResult {
  success: boolean
  transactionId?: string
  error?: string
  actualSlippage?: number
  executedAmount?: string
}

export interface MarketPrice {
  sellAsset: string
  buyAsset: string
  price: string
  timestamp: string
  source: string
}

export interface BalanceValidation {
  valid: boolean
  errors: string[]
  tradesCount: number
}

export interface OptimalRoute {
  success: boolean
  route: TradeInstruction[]
  fromAsset: string
  toAsset: string
  inputAmount: string
  routeLength: number
}

export interface SupportedAssets {
  assets: string[]
  count: number
  lastUpdated: string
}

export class TradingService {
  private baseUrl = '/trading'

  /**
   * Get current market price for asset pair from Stellar DEX
   */
  async getMarketPrice(sellAsset: string, buyAsset: string): Promise<MarketPrice> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/market-price/${sellAsset}/${buyAsset}`)
      return response.data
    } catch (error) {
      console.error('Failed to get market price:', error)
      throw new Error(`Failed to get market price for ${sellAsset}/${buyAsset}`)
    }
  }

  /**
   * Build a single swap transaction for user approval
   */
  async buildSwapTransaction(
    userPublicKey: string, 
    trade: TradeInstruction
  ): Promise<TradeTransaction> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/build-swap`, {
        userPublicKey,
        trade
      })
      
      if (response.data.success) {
        return response.data.transaction
      } else {
        throw new Error('Failed to build swap transaction')
      }
    } catch (error) {
      console.error('Failed to build swap transaction:', error)
      throw new Error('Failed to build swap transaction')
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
      const response = await apiClient.post(`${this.baseUrl}/build-rebalance`, {
        userPublicKey,
        trades
      })
      
      if (response.data.success) {
        return response.data.transaction
      } else {
        throw new Error('Failed to build rebalance transaction')
      }
    } catch (error) {
      console.error('Failed to build rebalance transaction:', error)
      throw new Error('Failed to build rebalance transaction')
    }
  }

  /**
   * Submit a signed transaction to the Stellar network
   */
  async submitTransaction(signedXDR: string): Promise<TradeResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/submit-transaction`, {
        signedXDR
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to submit transaction:', error)
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
        return (error.response as { data: { success: boolean; error: string; transactionId?: string } }).data
      }
      return {
        success: false,
        error: 'Failed to submit transaction'
      }
    }
  }

  /**
   * Check if user has sufficient balance for trades
   */
  async validateTradeBalances(
    userPublicKey: string, 
    trades: TradeInstruction[]
  ): Promise<BalanceValidation> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/validate-balances`, {
        userPublicKey,
        trades
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to validate balances:', error)
      return {
        valid: false,
        errors: ['Failed to validate balances'],
        tradesCount: trades.length
      }
    }
  }

  /**
   * Get optimal trade route for asset pair and amount
   */
  async getOptimalRoute(
    fromAsset: string, 
    toAsset: string, 
    amount: string
  ): Promise<OptimalRoute> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/optimal-route`, {
        fromAsset,
        toAsset,
        amount
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to get optimal route:', error)
      throw new Error('Failed to get optimal route')
    }
  }

  /**
   * Record trade execution results in database
   */
  async recordTradeExecution(
    portfolioId: string, 
    transactionId: string, 
    result: TradeResult
  ): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/record-execution`, {
        portfolioId,
        transactionId,
        result
      })
    } catch (error) {
      console.error('Failed to record trade execution:', error)
      // Don't throw - this is non-critical for user experience
    }
  }

  /**
   * Get list of supported trading assets
   */
  async getSupportedAssets(): Promise<SupportedAssets> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/supported-assets`)
      return response.data
    } catch (error) {
      console.error('Failed to get supported assets:', error)
      // Return fallback list
      return {
        assets: ['XLM', 'USDC', 'KALE'],
        count: 3,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * Execute complete trading flow: validate -> build -> sign -> submit -> record
   */
  async executeTrade(
    userPublicKey: string,
    trade: TradeInstruction,
    portfolioId?: string
  ): Promise<TradeResult> {
    try {
      // Step 1: Validate balances
      const validation = await this.validateTradeBalances(userPublicKey, [trade])
      if (!validation.valid) {
        return {
          success: false,
          error: `Insufficient balance: ${validation.errors.join(', ')}`
        }
      }

      // Step 2: Build transaction
      const transaction = await this.buildSwapTransaction(userPublicKey, trade)

      // Step 3: Sign transaction (this will be handled by Freighter)
      const signedXDR = await this.signTransactionWithFreighter(transaction.xdr)
      if (!signedXDR) {
        return {
          success: false,
          error: 'Transaction was not signed'
        }
      }

      // Step 4: Submit transaction
      const result = await this.submitTransaction(signedXDR)

      // Step 5: Record execution (if portfolio provided)
      if (portfolioId && result.transactionId) {
        await this.recordTradeExecution(portfolioId, result.transactionId, result)
      }

      return result
    } catch (error) {
      console.error('Trade execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trade execution failed'
      }
    }
  }

  /**
   * Execute complete rebalancing flow: validate -> build -> sign -> submit -> record
   */
  async executeRebalance(
    userPublicKey: string,
    trades: TradeInstruction[],
    portfolioId: string
  ): Promise<TradeResult> {
    try {
      // Step 1: Validate balances
      const validation = await this.validateTradeBalances(userPublicKey, trades)
      if (!validation.valid) {
        return {
          success: false,
          error: `Insufficient balance: ${validation.errors.join(', ')}`
        }
      }

      // Step 2: Build transaction
      const transaction = await this.buildRebalanceTransaction(userPublicKey, trades)

      // Step 3: Sign transaction (this will be handled by Freighter)
      const signedXDR = await this.signTransactionWithFreighter(transaction.xdr)
      if (!signedXDR) {
        return {
          success: false,
          error: 'Transaction was not signed'
        }
      }

      // Step 4: Submit transaction
      const result = await this.submitTransaction(signedXDR)

      // Step 5: Record execution
      if (result.transactionId) {
        await this.recordTradeExecution(portfolioId, result.transactionId, result)
      }

      return result
    } catch (error) {
      console.error('Rebalance execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rebalance execution failed'
      }
    }
  }

  /**
   * Sign transaction using Freighter wallet
   */
  private async signTransactionWithFreighter(xdr: string): Promise<string | null> {
    try {
      // Check if Freighter is available
      if (!window.freighter) {
        throw new Error('Freighter wallet not installed')
      }

      // Get current network (should match backend)
      const network = 'TESTNET' // TODO: Make this configurable based on environment

      // Sign the transaction
      const signedTransaction = await window.freighter.signTransaction(xdr, {
        network,
        accountToSign: await window.freighter.getPublicKey()
      })

      return signedTransaction
    } catch (error) {
      console.error('Failed to sign transaction with Freighter:', error)
      return null
    }
  }
}

// Singleton instance
export const tradingService = new TradingService()

// Freighter window type extension
declare global {
  interface Window {
    freighter: {
      getPublicKey(): Promise<string>
      signTransaction(xdr: string, options: {
        network: string
        accountToSign: string
      }): Promise<string>
      isConnected(): Promise<boolean>
      requestAccess(): Promise<{ publicKey: string }>
    }
  }
}