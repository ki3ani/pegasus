/**
 * Background Jobs Management Routes
 * Monitor and control background job execution
 */

import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import { param, validationResult } from 'express-validator'
import { priceUpdateJob } from '../jobs/priceUpdateJob'
import { authenticateToken } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

const router = Router()

// Apply authentication to all routes
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
 * GET /jobs/status
 * Get status of all background jobs
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const priceJobStatus = priceUpdateJob.getJobStatus()
    const oracleHealth = await priceUpdateJob.checkOracleHealth()

    res.json({
      jobs: {
        priceUpdate: {
          ...priceJobStatus,
          oracleHealth
        }
      },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to get job status:', error)
    res.status(500).json({ error: 'Failed to get job status' })
  }
})

/**
 * POST /jobs/price-update/run
 * Manually trigger price update job
 */
router.post('/price-update/run', async (req: AuthRequest, res: Response) => {
  try {
    const success = await priceUpdateJob.forceUpdate()
    
    if (success) {
      res.json({ 
        message: 'Price update job executed successfully',
        timestamp: new Date()
      })
    } else {
      res.status(500).json({ 
        error: 'Price update job failed',
        timestamp: new Date()
      })
    }
  } catch (error) {
    console.error('Failed to run price update job:', error)
    res.status(500).json({ error: 'Failed to execute price update job' })
  }
})

/**
 * GET /jobs/price-update/status
 * Get detailed price update job status
 */
router.get('/price-update/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = priceUpdateJob.getJobStatus()
    const oracleHealth = await priceUpdateJob.checkOracleHealth()

    res.json({
      ...status,
      oracleHealth,
      uptime: process.uptime(),
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to get price update job status:', error)
    res.status(500).json({ error: 'Failed to get job status' })
  }
})

/**
 * GET /jobs/price-history/:asset
 * Get recent price history for monitoring
 */
router.get('/price-history/:asset', [
  param('asset').notEmpty().isAlpha().isLength({ min: 2, max: 10 })
], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const asset = req.params.asset.toUpperCase()
    const hours = parseInt(req.query.hours as string) || 24
    
    if (hours > 168) { // Max 1 week
      return res.status(400).json({ error: 'Maximum 168 hours (1 week) of history allowed' })
    }

    const history = await priceUpdateJob.getPriceHistory(asset, hours)

    res.json({
      asset,
      history,
      hours,
      count: history.length,
      timestamp: new Date()
    })
  } catch (error) {
    console.error(`Failed to get price history for ${req.params.asset}:`, error)
    res.status(500).json({ error: 'Failed to get price history' })
  }
})

export default router