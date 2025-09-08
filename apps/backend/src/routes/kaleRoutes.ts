/**
 * KALE Token API Routes
 * Handles KALE rewards, staking, and trustline management
 */

import { Router } from 'express'
import type { Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { kaleService } from '../services/kaleService'
import { prisma } from '../services/db'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Validation middleware
const validateRequest = (req: AuthRequest, res: Response, next: () => void) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }
  next()
}

/**
 * GET /api/kale/status
 * Get user's KALE status, balance, and rewards summary
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userPublicKey = req.user!.publicKey

    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key required' })
    }

    // Check KALE trustline
    const hasTrustline = await kaleService.checkKaleTrustline(userPublicKey)
    
    // Get KALE balance
    const balance = hasTrustline ? await kaleService.getKaleBalance(userPublicKey) : '0.0000000'
    
    // Get pending rewards using raw SQL
    const pendingRewardsResult = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
      FROM kale_rewards
      WHERE user_id = ${userId} AND status IN ('pending', 'pending_trustline')
    `
    const pendingRewardsTotal = pendingRewardsResult[0]?.total || '0'

    // Get completed rewards using raw SQL
    const completedRewardsResult = await prisma.$queryRaw<{ total: string; count: number }[]>`
      SELECT 
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total,
        COUNT(*) as count
      FROM kale_rewards
      WHERE user_id = ${userId} AND status = 'completed'
    `
    const completedRewardsTotal = completedRewardsResult[0]?.total || '0'
    const completedRewardsCount = completedRewardsResult[0]?.count || 0

    // Get staking info
    const stakingInfo = await kaleService.getStakingInfo(userId)
    const totalStaked = stakingInfo.reduce((sum, stake) => 
      sum + parseFloat(stake.stakedAmount), 0
    ).toFixed(7)

    res.json({
      kale: {
        hasTrustline,
        balance,
        pendingRewards: pendingRewardsTotal,
        totalEarned: completedRewardsTotal,
        rewardCount: completedRewardsCount,
        staking: {
          totalStaked,
          positions: stakingInfo.length,
          apy: stakingInfo[0]?.apy || 0
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('KALE status error:', error)
    res.status(500).json({ 
      error: 'Failed to get KALE status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/kale/setup-trustline
 * Generate KALE trustline transaction for user approval
 */
router.post('/setup-trustline', async (req: AuthRequest, res: Response) => {
  try {
    const userPublicKey = req.user!.publicKey

    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key required' })
    }

    // Check if trustline already exists
    const hasTrustline = await kaleService.checkKaleTrustline(userPublicKey)
    if (hasTrustline) {
      return res.status(400).json({ error: 'KALE trustline already exists' })
    }

    // Build trustline transaction
    const transactionXDR = await kaleService.buildKaleTrustlineTransaction(userPublicKey)

    res.json({
      success: true,
      transaction: {
        xdr: transactionXDR,
        description: 'Add KALE token trustline to your account',
        note: 'This enables you to receive KALE rewards'
      }
    })

  } catch (error) {
    console.error('KALE trustline setup error:', error)
    res.status(500).json({ 
      error: 'Failed to setup KALE trustline',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/kale/rewards
 * Get user's KALE reward history
 */
router.get('/rewards', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'completed', 'failed', 'pending_trustline'])
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const limit = parseInt(req.query.limit as string) || 50
    const status = req.query.status as string

    const where: { userId: string; status?: string } = { userId }
    if (status) where.status = status

    const rewards = await prisma.kaleReward.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        status: true,
        transactionHash: true,
        createdAt: true
      }
    })

    res.json({ 
      rewards,
      count: rewards.length 
    })

  } catch (error) {
    console.error('KALE rewards history error:', error)
    res.status(500).json({ 
      error: 'Failed to get reward history',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/kale/claim-rewards
 * Process pending rewards for users with KALE trustline
 */
router.post('/claim-rewards', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userPublicKey = req.user!.publicKey

    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key required' })
    }

    // Check KALE trustline
    const hasTrustline = await kaleService.checkKaleTrustline(userPublicKey)
    if (!hasTrustline) {
      return res.status(400).json({ 
        error: 'KALE trustline required',
        suggestion: 'Use /setup-trustline endpoint first'
      })
    }

    // Get pending rewards
    const pendingRewards = await prisma.kaleReward.findMany({
      where: {
        userId,
        status: { in: ['pending', 'pending_trustline'] }
      }
    })

    if (pendingRewards.length === 0) {
      return res.status(400).json({ error: 'No pending rewards to claim' })
    }

    // Process each reward
    const results = []
    for (const reward of pendingRewards) {
      try {
        await kaleService.distributeReward(
          {
            userId: reward.userId,
            amount: reward.amount,
            type: reward.type as 'rebalance' | 'auto_rebalance' | 'daily_bonus' | 'staking_reward',
            description: reward.description,
            portfolioId: reward.portfolioId || undefined,
            transactionId: reward.transactionId || undefined
          },
          userPublicKey
        )
        results.push({ rewardId: reward.id, status: 'success' })
      } catch (error) {
        results.push({ 
          rewardId: reward.id, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const totalAmount = pendingRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0)

    res.json({
      success: true,
      message: `Claimed ${successCount}/${pendingRewards.length} rewards`,
      totalAmount: totalAmount.toFixed(7),
      results
    })

  } catch (error) {
    console.error('KALE claim rewards error:', error)
    res.status(500).json({ 
      error: 'Failed to claim rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/kale/stake
 * Start staking KALE tokens
 */
router.post('/stake', [
  body('amount').isString().matches(/^\d+(\.\d{1,7})?$/)
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userPublicKey = req.user!.publicKey
    const { amount } = req.body

    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key required' })
    }

    // Check KALE balance
    const balance = await kaleService.getKaleBalance(userPublicKey)
    if (parseFloat(balance) < parseFloat(amount)) {
      return res.status(400).json({ 
        error: 'Insufficient KALE balance',
        available: balance,
        requested: amount
      })
    }

    await kaleService.startStaking(userId, userPublicKey, amount)

    res.json({
      success: true,
      message: `Started staking ${amount} KALE`,
      apy: 12.0,
      note: 'Staking rewards are calculated daily'
    })

  } catch (error) {
    console.error('KALE staking error:', error)
    res.status(500).json({ 
      error: 'Failed to start staking',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/kale/staking
 * Get user's KALE staking positions
 */
router.get('/staking', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const stakingInfo = await kaleService.getStakingInfo(userId)

    res.json({
      positions: stakingInfo,
      summary: {
        totalStaked: stakingInfo.reduce((sum, stake) => 
          sum + parseFloat(stake.stakedAmount), 0
        ).toFixed(7),
        averageApy: stakingInfo.length > 0 ? stakingInfo[0].apy * 100 : 0,
        positionCount: stakingInfo.length
      }
    })

  } catch (error) {
    console.error('KALE staking info error:', error)
    res.status(500).json({ 
      error: 'Failed to get staking info',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/kale/calculate-daily-bonus
 * Calculate and award daily bonus (internal use)
 */
router.post('/calculate-daily-bonus', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userPublicKey = req.user!.publicKey

    if (!userPublicKey) {
      return res.status(400).json({ error: 'User public key required' })
    }

    const bonus = await kaleService.calculateDailyBonus(userId)
    
    if (!bonus) {
      return res.json({ 
        message: 'No daily bonus available',
        reasons: ['Already claimed today', 'No recent activity']
      })
    }

    // Award the bonus
    await kaleService.distributeReward(bonus, userPublicKey)

    res.json({
      success: true,
      bonus: {
        amount: bonus.amount,
        description: bonus.description
      }
    })

  } catch (error) {
    console.error('KALE daily bonus error:', error)
    res.status(500).json({ 
      error: 'Failed to calculate daily bonus',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as kaleRoutes }