/**
 * Portfolio Management API Routes
 * Handles portfolio creation, analysis, and rebalancing operations
 */

import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { portfolioEngine } from '../services/portfolioEngine'
import { prisma } from '../services/db'
import { authenticateToken } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { reflectorOracleClient, ReflectorOracleClient } from '../services/reflectorOracleClient'
import { kaleService } from '../services/kaleService'

const router = Router()

// Public endpoints (no authentication required)
/**
 * GET /portfolios/oracle-status
 * Check Reflector oracle client status (no auth for demo)
 */
router.get('/oracle-status', async (req, res: Response) => {
  try {
    // Test oracle connectivity
    const decimals = await reflectorOracleClient.decimals()
    
    res.json({
      status: 'connected',
      oracle: 'reflector',
      decimals,
      network: process.env.STELLAR_NETWORK || 'testnet',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Oracle status check failed:', error)
    res.status(500).json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /portfolios/test-price/:asset
 * Test price fetching for a specific asset (no auth for demo)
 */
router.get('/test-price/:asset', [
  param('asset').notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }
  
  try {
    const { asset } = req.params
    
    // Create Reflector asset format
    const reflectorAsset = ReflectorOracleClient.createReflectorAsset(asset)
    
    // Get price from oracle
    const priceData = await reflectorOracleClient.lastprice(reflectorAsset)
    
    if (!priceData) {
      return res.status(404).json({
        error: `No price data available for ${asset}`,
        asset: reflectorAsset
      })
    }
    
    res.json({
      asset,
      reflectorAsset,
      price: priceData.price,
      timestamp: priceData.timestamp,
      decimals: priceData.decimals,
      source: 'reflector-oracle'
    })

  } catch (error) {
    console.error('Price test error:', error)
    res.status(500).json({
      error: 'Failed to fetch price data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Apply authentication to remaining routes
router.use(authenticateToken)

// Validation middleware
const validateRequest = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }
  next()
}

/**
 * GET /portfolios
 * Get all portfolios for authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId

    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        _count: {
          select: { transactions: true, snapshots: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ portfolios })
  } catch (error) {
    console.error('Failed to fetch portfolios:', error)
    res.status(500).json({ error: 'Failed to fetch portfolios' })
  }
})

/**
 * POST /portfolios
 * Create new portfolio
 */
router.post('/', [
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('targetAllocations').isObject().custom((allocations) => {
    const values = Object.values(allocations) as number[]
    const sum = values.reduce((a: number, b: number) => a + b, 0)
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error('Target allocations must sum to 100%')
    }
    return true
  }),
  body('riskThreshold').optional().isFloat({ min: 0.1, max: 50 }),
  body('autoRebalance').optional().isBoolean(),
  body('maxAutoAmount').optional().isString(),
  body('minTradeAmount').optional().isString(),
  body('maxSlippage').optional().isFloat({ min: 0.1, max: 10 }),
  body('rebalanceFrequency').optional().isIn(['hourly', 'daily', 'weekly', 'monthly'])
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userEmail = req.user!.email
    const {
      name,
      targetAllocations,
      riskThreshold = 5.0,
      autoRebalance = false,
      maxAutoAmount = '1000',
      minTradeAmount = '10',
      maxSlippage = 1.0,
      rebalanceFrequency = 'weekly'
    } = req.body

    // Ensure user exists in our database (for Supabase users)
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail }, // Update email if it changed
      create: {
        id: userId,
        email: userEmail,
        passwordHash: 'supabase-managed' // Placeholder since Supabase handles auth
      }
    })

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        targetAllocations,
        riskThreshold,
        autoRebalance,
        maxAutoAmount,
        minTradeAmount,
        maxSlippage,
        rebalanceFrequency
      }
    })

    res.status(201).json({ portfolio })
  } catch (error) {
    console.error('Failed to create portfolio:', error)
    res.status(500).json({ error: 'Failed to create portfolio' })
  }
})

/**
 * GET /portfolios/:id
 * Get specific portfolio details
 */
router.get('/:id', [
  param('id').notEmpty()
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    res.json({ portfolio })
  } catch (error) {
    console.error('Failed to fetch portfolio:', error)
    res.status(500).json({ error: 'Failed to fetch portfolio' })
  }
})

/**
 * PUT /portfolios/:id
 * Update portfolio configuration
 */
router.put('/:id', [
  param('id').notEmpty(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('targetAllocations').optional().isObject(),
  body('riskThreshold').optional().isFloat({ min: 0.1, max: 50 }),
  body('autoRebalance').optional().isBoolean(),
  body('maxAutoAmount').optional().isString(),
  body('minTradeAmount').optional().isString(),
  body('maxSlippage').optional().isFloat({ min: 0.1, max: 10 }),
  body('rebalanceFrequency').optional().isIn(['hourly', 'daily', 'weekly', 'monthly'])
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const updates = req.body

    // Validate target allocations if provided
    if (updates.targetAllocations) {
      const sum = (Object.values(updates.targetAllocations) as number[]).reduce((a: number, b: number) => a + b, 0)
      if (Math.abs(sum - 100) > 0.01) {
        return res.status(400).json({ error: 'Target allocations must sum to 100%' })
      }
    }

    const portfolio = await prisma.portfolio.updateMany({
      where: { id, userId },
      data: updates
    })

    if (portfolio.count === 0) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id }
    })

    res.json({ portfolio: updatedPortfolio })
  } catch (error) {
    console.error('Failed to update portfolio:', error)
    res.status(500).json({ error: 'Failed to update portfolio' })
  }
})

/**
 * DELETE /portfolios/:id
 * Delete portfolio
 */
router.delete('/:id', [
  param('id').notEmpty()
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    const result = await prisma.portfolio.deleteMany({
      where: { id, userId }
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    res.json({ message: 'Portfolio deleted successfully' })
  } catch (error) {
    console.error('Failed to delete portfolio:', error)
    res.status(500).json({ error: 'Failed to delete portfolio' })
  }
})

/**
 * POST /portfolios/:id/analyze
 * Analyze portfolio drift and get rebalancing suggestions
 */
router.post('/:id/analyze', [
  param('id').notEmpty(),
  body('balances').isObject().custom((balances) => {
    // Validate that balances contain numeric strings
    for (const [asset, balance] of Object.entries(balances)) {
      if (typeof balance !== 'string' || isNaN(parseFloat(balance as string))) {
        throw new Error(`Invalid balance for ${asset}`)
      }
    }
    return true
  })
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { balances } = req.body
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    // Perform analysis
    const analysis = await portfolioEngine.analyzePortfolio(id, balances)
    
    // Create snapshot for tracking
    await portfolioEngine.createSnapshot(id, analysis)

    res.json({ analysis })
  } catch (error) {
    console.error('Portfolio analysis failed:', error)
    res.status(500).json({ error: 'Portfolio analysis failed' })
  }
})

/**
 * GET /portfolios/:id/performance
 * Get portfolio performance metrics
 */
router.get('/:id/performance', [
  param('id').notEmpty(),
  query('days').optional().isInt({ min: 1, max: 365 })
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const days = parseInt(req.query.days as string) || 30
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const metrics = await portfolioEngine.getPerformanceMetrics(id, days)
    
    res.json({ metrics })
  } catch (error) {
    console.error('Failed to get performance metrics:', error)
    res.status(500).json({ error: 'Failed to get performance metrics' })
  }
})

/**
 * GET /portfolios/:id/snapshots
 * Get portfolio snapshots history
 */
router.get('/:id/snapshots', [
  param('id').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('days').optional().isInt({ min: 1, max: 365 })
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const days = parseInt(req.query.days as string) || 30
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId: id,
        timestamp: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    res.json({ snapshots })
  } catch (error) {
    console.error('Failed to get snapshots:', error)
    res.status(500).json({ error: 'Failed to get snapshots' })
  }
})

/**
 * GET /portfolios/:id/transactions
 * Get portfolio transaction history
 */
router.get('/:id/transactions', [
  param('id').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['rebalance', 'deposit', 'withdrawal', 'auto_rebalance'])
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const type = req.query.type as string
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const where: { portfolioId: string; type?: string } = { portfolioId: id }
    if (type) where.type = type

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    res.json({ transactions })
  } catch (error) {
    console.error('Failed to get transactions:', error)
    res.status(500).json({ error: 'Failed to get transactions' })
  }
})

/**
 * POST /portfolios/:id/rebalance
 * Execute manual rebalance
 */
router.post('/:id/rebalance', [
  param('id').notEmpty(),
  body('trades').isArray().custom((trades) => {
    trades.forEach((trade: { fromAsset?: string; toAsset?: string; fromAmount?: string }) => {
      if (!trade.fromAsset || !trade.toAsset || !trade.fromAmount) {
        throw new Error('Invalid trade instruction')
      }
    })
    return true
  }),
  body('userConfirmed').isBoolean()
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { trades, userConfirmed } = req.body
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    if (!userConfirmed) {
      return res.status(400).json({ error: 'User confirmation required for rebalancing' })
    }

    // Create transaction records
    const transactionPromises = trades.map((trade: { fromAsset: string; toAsset: string; fromAmount: string; expectedToAmount?: string }) => 
      prisma.transaction.create({
        data: {
          portfolioId: id,
          type: 'rebalance',
          triggerReason: 'manual',
          fromAsset: trade.fromAsset,
          toAsset: trade.toAsset,
          fromAmount: trade.fromAmount,
          expectedAmount: trade.expectedToAmount,
          status: 'pending'
        }
      })
    )

    const transactions = await Promise.all(transactionPromises)

    // Update last rebalance time
    await prisma.portfolio.update({
      where: { id },
      data: { lastRebalance: new Date() }
    })

    // Award KALE reward for manual rebalancing
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.publicKey) {
        const reward = await kaleService.calculateRebalanceReward(id, 'manual')
        await kaleService.distributeReward(reward, user.publicKey)
        console.log(`🥬 Awarded ${reward.amount} KALE for manual rebalance`)
      }
    } catch (kaleError) {
      console.error('KALE reward error:', kaleError)
      // Don't fail the rebalance for KALE errors
    }

    res.json({ 
      message: 'Rebalance initiated',
      transactions,
      kaleReward: '10.0000000', // Standard manual rebalance reward
      note: 'Complete the trades using your Stellar wallet, then update transaction status. KALE rewards will be distributed automatically.'
    })
  } catch (error) {
    console.error('Failed to initiate rebalance:', error)
    res.status(500).json({ error: 'Failed to initiate rebalance' })
  }
})

/**
 * PUT /portfolios/:id/transactions/:txId
 * Update transaction status after wallet execution
 */
router.put('/:id/transactions/:txId', [
  param('id').notEmpty(),
  param('txId').notEmpty(),
  body('status').isIn(['completed', 'failed', 'cancelled']),
  body('stellarTxId').optional().isString(),
  body('actualSlippage').optional().isFloat(),
  body('gasFee').optional().isString(),
  body('errorMessage').optional().isString()
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const { id, txId } = req.params
    const { status, stellarTxId, actualSlippage, gasFee, errorMessage } = req.body
    const userId = req.user!.userId

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userId }
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const updateData: {
      status: string;
      completedAt: Date | null;
      stellarTxId?: string;
      actualSlippage?: number;
      gasFee?: string;
      errorMessage?: string;
    } = {
      status,
      completedAt: status === 'completed' ? new Date() : null
    }

    if (stellarTxId) updateData.stellarTxId = stellarTxId
    if (actualSlippage !== undefined) updateData.actualSlippage = actualSlippage
    if (gasFee) updateData.gasFee = gasFee
    if (errorMessage) updateData.errorMessage = errorMessage

    const transaction = await prisma.transaction.updateMany({
      where: { id: txId, portfolioId: id },
      data: updateData
    })

    if (transaction.count === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json({ message: 'Transaction updated successfully' })
  } catch (error) {
    console.error('Failed to update transaction:', error)
    res.status(500).json({ error: 'Failed to update transaction' })
  }
})

/**
 * POST /portfolios/reflector-rebalance
 * Generate rebalancing recommendations using Reflector oracle (no auth for demo)
 */
router.post('/reflector-rebalance', [
  body('positions').isArray().custom((positions) => {
    positions.forEach((pos: { asset?: string; amount?: string }) => {
      if (!pos.asset || !pos.amount || isNaN(parseFloat(pos.amount))) {
        throw new Error('Invalid position format')
      }
    })
    return true
  })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { positions } = req.body

    // Convert positions to Reflector format
    const portfolioPositions = positions.map((pos: { asset: string; amount: string }) => ({
      asset: ReflectorOracleClient.createReflectorAsset(pos.asset),
      amount: pos.amount
    }))

    console.log(`🔄 Processing Reflector rebalance request for ${positions.length} positions`)

    // Get rebalancing recommendations from Reflector oracle
    const recommendations = await reflectorOracleClient.rebalancePortfolio(portfolioPositions)

    res.json({
      success: true,
      recommendations,
      timestamp: new Date().toISOString(),
      source: 'reflector-oracle',
      message: `Generated ${recommendations.length} rebalancing recommendations`
    })

  } catch (error) {
    console.error('Reflector portfolio rebalancing error:', error)
    res.status(500).json({ 
      error: 'Failed to generate rebalancing recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})


export default router