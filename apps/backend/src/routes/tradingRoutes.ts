import { Router } from 'express'
import { z } from 'zod'
import { stellarTradingService } from '../services/stellarTradingService'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Validation schemas
const TradeInstructionSchema = z.object({
  fromAsset: z.string().min(1),
  toAsset: z.string().min(1),
  fromAmount: z.string().regex(/^\d+\.?\d*$/),
  expectedToAmount: z.string().regex(/^\d+\.?\d*$/),
  maxSlippage: z.number().min(0).max(100),
  priority: z.number().min(1)
})

const SingleSwapSchema = z.object({
  userPublicKey: z.string().min(1),
  trade: TradeInstructionSchema
})

const BatchRebalanceSchema = z.object({
  userPublicKey: z.string().min(1),
  trades: z.array(TradeInstructionSchema).min(1)
})

const SubmitTransactionSchema = z.object({
  signedXDR: z.string().min(1)
})

const ValidateBalanceSchema = z.object({
  userPublicKey: z.string().min(1),
  trades: z.array(TradeInstructionSchema).min(1)
})

const MarketPriceSchema = z.object({
  sellAsset: z.string().min(1),
  buyAsset: z.string().min(1)
})

const OptimalRouteSchema = z.object({
  fromAsset: z.string().min(1),
  toAsset: z.string().min(1),
  amount: z.string().regex(/^\d+\.?\d*$/)
})

const RecordTradeSchema = z.object({
  portfolioId: z.string().min(1),
  transactionId: z.string().min(1),
  result: z.object({
    success: z.boolean(),
    transactionId: z.string().optional(),
    error: z.string().optional(),
    actualSlippage: z.number().optional(),
    executedAmount: z.string().optional()
  })
})

/**
 * GET /api/trading/market-price/:sellAsset/:buyAsset
 * Get current market price for asset pair from Stellar DEX
 */
router.get('/market-price/:sellAsset/:buyAsset', async (req, res) => {
  try {
    const { sellAsset, buyAsset } = req.params
    const validation = MarketPriceSchema.safeParse({ sellAsset, buyAsset })
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid parameters',
        details: validation.error.issues
      })
    }

    const price = await stellarTradingService.getMarketPrice(sellAsset, buyAsset)
    
    if (!price) {
      return res.status(404).json({ 
        error: `No market available for ${sellAsset}/${buyAsset}` 
      })
    }

    res.json({
      sellAsset,
      buyAsset,
      price,
      timestamp: new Date().toISOString(),
      source: 'stellar-dex'
    })
  } catch (error) {
    console.error('Market price error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch market price',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/build-swap
 * Build a single swap transaction for user approval
 */
router.post('/build-swap', async (req, res) => {
  try {
    const validation = SingleSwapSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { userPublicKey, trade } = validation.data
    const transaction = await stellarTradingService.buildSwapTransaction(userPublicKey, trade)

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        xdr: transaction.xdr,
        estimatedFee: transaction.estimatedFee,
        expiresAt: transaction.expiresAt,
        trade: transaction.trades[0]
      }
    })
  } catch (error) {
    console.error('Build swap error:', error)
    res.status(500).json({ 
      error: 'Failed to build swap transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/build-rebalance
 * Build a batched rebalancing transaction with multiple swaps
 */
router.post('/build-rebalance', async (req, res) => {
  try {
    const validation = BatchRebalanceSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { userPublicKey, trades } = validation.data
    const transaction = await stellarTradingService.buildRebalanceTransaction(userPublicKey, trades)

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        xdr: transaction.xdr,
        estimatedFee: transaction.estimatedFee,
        expiresAt: transaction.expiresAt,
        tradesCount: transaction.trades.length,
        trades: transaction.trades
      }
    })
  } catch (error) {
    console.error('Build rebalance error:', error)
    res.status(500).json({ 
      error: 'Failed to build rebalance transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/submit-transaction
 * Submit a signed transaction to the Stellar network
 */
router.post('/submit-transaction', authenticateToken, async (req, res) => {
  try {
    const validation = SubmitTransactionSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { signedXDR } = validation.data
    const result = await stellarTradingService.submitTransaction(signedXDR)

    if (result.success) {
      res.json({
        success: true,
        transactionId: result.transactionId,
        actualSlippage: result.actualSlippage,
        executedAmount: result.executedAmount
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('Submit transaction error:', error)
    res.status(500).json({ 
      error: 'Failed to submit transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/validate-balances
 * Check if user has sufficient balance for trades
 */
router.post('/validate-balances', async (req, res) => {
  try {
    const validation = ValidateBalanceSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { userPublicKey, trades } = validation.data
    const validation_result = await stellarTradingService.validateTradeBalances(userPublicKey, trades)

    res.json({
      valid: validation_result.valid,
      errors: validation_result.errors,
      tradesCount: trades.length
    })
  } catch (error) {
    console.error('Validate balances error:', error)
    res.status(500).json({ 
      error: 'Failed to validate balances',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/optimal-route
 * Get optimal trade route for asset pair and amount
 */
router.post('/optimal-route', authenticateToken, async (req, res) => {
  try {
    const validation = OptimalRouteSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { fromAsset, toAsset, amount } = validation.data
    const route = await stellarTradingService.getOptimalRoute(fromAsset, toAsset, amount)

    res.json({
      success: true,
      route,
      fromAsset,
      toAsset,
      inputAmount: amount,
      routeLength: route.length
    })
  } catch (error) {
    console.error('Optimal route error:', error)
    res.status(500).json({ 
      error: 'Failed to get optimal route',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/trading/record-execution
 * Record trade execution results in database
 */
router.post('/record-execution', authenticateToken, async (req, res) => {
  try {
    const validation = RecordTradeSchema.safeParse(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { portfolioId, transactionId, result } = validation.data
    
    // We need the transaction details to record properly
    // In a real app, we'd store pending transactions and retrieve them here
    // For now, we'll create a minimal transaction record
    const mockTransaction = {
      id: transactionId,
      xdr: '',
      trades: [], // Would be populated from stored transaction
      estimatedFee: '0',
      expiresAt: new Date(),
      userPublicKey: ''
    }

    await stellarTradingService.recordTradeExecution(portfolioId, mockTransaction, result)

    res.json({
      success: true,
      message: 'Trade execution recorded successfully',
      portfolioId,
      transactionId
    })
  } catch (error) {
    console.error('Record execution error:', error)
    res.status(500).json({ 
      error: 'Failed to record trade execution',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/trading/supported-assets
 * Get list of supported trading assets
 */
router.get('/supported-assets', async (req, res) => {
  try {
    // Return hardcoded list for now - could be made dynamic
    const supportedAssets = ['XLM', 'USDC', 'KALE']
    
    res.json({
      assets: supportedAssets,
      count: supportedAssets.length,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Supported assets error:', error)
    res.status(500).json({ 
      error: 'Failed to get supported assets',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as tradingRoutes }